import logging
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING, ReturnDocument
from app.extensions import mongo
from app.models.token import TokenModel, TokenStatus
from app.models.queue import QueueModel, QueueStatus
from app.models.counter import CounterModel, CounterStatus
from app.models import serialize_doc
from app.services.notification_service import NotificationService
from app.services.wait_time_service import WaitTimeService

logger = logging.getLogger("smartqueue.queue_service")


class QueueService:
    """Orchestrates queue advancing, token calling, service lifecycle, and staff counter operations."""

    @classmethod
    def call_next_token(cls, queue_id, counter_id, staff_user):
        """Atomically call the next eligible waiting token in the queue to a staff counter."""
        db = mongo.get_db()
        queue_oid = ObjectId(queue_id) if ObjectId.is_valid(queue_id) else queue_id
        counter_oid = ObjectId(counter_id) if ObjectId.is_valid(counter_id) else counter_id
        staff_id_raw = staff_user.get("id") if staff_user else None
        staff_oid = ObjectId(staff_id_raw) if (staff_id_raw and ObjectId.is_valid(staff_id_raw)) else staff_id_raw

        # 1. Verify queue and counter status
        queue = QueueModel.find_by_id(db, queue_oid)
        if not queue:
            return None, "Queue not found."
        if queue.get("status") == QueueStatus.PAUSED:
            return None, "Cannot call next token: Queue is currently paused."
        if queue.get("status") == QueueStatus.CLOSED:
            return None, "Cannot call next token: Queue is closed."

        counter = CounterModel.find_by_id(db, counter_oid)
        if not counter:
            return None, "Counter not found."

        # 2. Complete previous token if counter was already serving
        if counter.get("current_token_id"):
            prev_token_id = counter["current_token_id"]
            TokenModel.update_status(db, prev_token_id, TokenStatus.COMPLETED)

        # 3. Atomically acquire next waiting token (concurrency-safe race condition prevention)
        now = datetime.now(timezone.utc)
        called_token_raw = TokenModel.get_collection(db).find_one_and_update(
            {"queue_id": queue_oid, "status": TokenStatus.WAITING},
            {
                "$set": {
                    "status": TokenStatus.CALLED,
                    "counter_id": counter_oid,
                    "served_by_staff_id": staff_oid,
                    "called_at": now,
                    "updated_at": now,
                }
            },
            sort=[("sequence_number", ASCENDING)],
            return_document=ReturnDocument.AFTER,
        )

        if not called_token_raw:
            # Update counter status to OPEN (idle waiting)
            CounterModel.update_status(db, counter_oid, CounterStatus.OPEN, current_token_id=None)
            cls._broadcast_queue_update(queue_id, "counter:updated", {"counter_id": str(counter_oid), "status": CounterStatus.OPEN})
            return None, "No more waiting tokens in this queue."

        called_token = serialize_doc(called_token_raw)

        # 4. Update Counter and Queue
        CounterModel.update_status(db, counter_oid, CounterStatus.BUSY, current_token_id=called_token["id"])
        QueueModel.update(db, queue_oid, {"current_serving_token_id": ObjectId(called_token["id"])})

        # Attach names
        called_token["counter_name"] = counter.get("name")
        called_token["counter_number"] = counter.get("counter_number")
        called_token["queue_name"] = queue.get("name")

        # 5. Send push notification to called student
        NotificationService.notify_token_called(called_token, counter.get("name", "Counter"))

        # 6. Notify the upcoming students (turn approaching alert for 1 and 2 ahead)
        waiting_tokens = TokenModel.get_waiting_tokens(db, queue_oid)
        if len(waiting_tokens) > 0:
            NotificationService.notify_turn_approaching(waiting_tokens[0], position_ahead=1)
        if len(waiting_tokens) > 1:
            NotificationService.notify_turn_approaching(waiting_tokens[1], position_ahead=2)

        # 7. Broadcast real-time updates
        cls._broadcast_queue_update(queue_id, "token:called", called_token)
        cls._broadcast_queue_update(queue_id, "queue:updated", cls.get_queue_status(queue_id))

        return called_token, None

    @classmethod
    def start_service(cls, token_id, staff_user):
        """Mark token as actively being served at the counter."""
        db = mongo.get_db()
        token = TokenModel.find_by_id(db, token_id)
        if not token:
            return None, "Token not found."

        if token.get("status") != TokenStatus.CALLED:
            return None, f"Cannot start service on token with status '{token.get('status')}'. Must be 'called'."

        updated = TokenModel.update_status(
            db,
            token_id=token["id"],
            new_status=TokenStatus.SERVING,
            staff_id=staff_user.get("id"),
        )

        cls._broadcast_queue_update(token["queue_id"], "token:serving", updated)
        return updated, None

    @classmethod
    def complete_service(cls, token_id, counter_id, staff_user):
        """Complete service for a token and release the counter to OPEN."""
        db = mongo.get_db()
        token = TokenModel.find_by_id(db, token_id)
        if not token:
            return None, "Token not found."

        updated_token = TokenModel.update_status(
            db,
            token_id=token["id"],
            new_status=TokenStatus.COMPLETED,
            staff_id=staff_user.get("id"),
        )

        # Free the counter
        if counter_id:
            CounterModel.update_status(db, counter_id, CounterStatus.OPEN, current_token_id=None)

        cls._broadcast_queue_update(token["queue_id"], "token:completed", updated_token)
        cls._broadcast_queue_update(token["queue_id"], "queue:updated", cls.get_queue_status(token["queue_id"]))

        return updated_token, None

    @classmethod
    def skip_token(cls, token_id, counter_id, staff_user, reason="Student did not show up"):
        """Mark token as skipped / no-show and free the counter."""
        db = mongo.get_db()
        token = TokenModel.find_by_id(db, token_id)
        if not token:
            return None, "Token not found."

        updated_token = TokenModel.update_status(
            db,
            token_id=token["id"],
            new_status=TokenStatus.SKIPPED,
            reason=reason,
            staff_id=staff_user.get("id"),
        )

        if counter_id:
            CounterModel.update_status(db, counter_id, CounterStatus.OPEN, current_token_id=None)

        cls._broadcast_queue_update(token["queue_id"], "token:skipped", updated_token)
        cls._broadcast_queue_update(token["queue_id"], "queue:updated", cls.get_queue_status(token["queue_id"]))

        return updated_token, None

    @classmethod
    def pause_queue(cls, queue_id, staff_user):
        """Temporarily pause a queue."""
        db = mongo.get_db()
        updated_queue = QueueModel.update_status(db, queue_id, QueueStatus.PAUSED)
        cls._broadcast_queue_update(queue_id, "queue:paused", updated_queue)
        cls._broadcast_queue_update(queue_id, "queue:updated", cls.get_queue_status(queue_id))
        return updated_queue, None

    @classmethod
    def resume_queue(cls, queue_id, staff_user):
        """Resume a paused queue."""
        db = mongo.get_db()
        updated_queue = QueueModel.update_status(db, queue_id, QueueStatus.ACTIVE)
        cls._broadcast_queue_update(queue_id, "queue:resumed", updated_queue)
        cls._broadcast_queue_update(queue_id, "queue:updated", cls.get_queue_status(queue_id))
        return updated_queue, None

    @classmethod
    def get_queue_status(cls, queue_id):
        """Get live authoritative queue state for display boards and clients."""
        db = mongo.get_db()
        queue = QueueModel.find_by_id(db, queue_id)
        if not queue:
            return None

        # Waiting tokens
        waiting_tokens = TokenModel.get_waiting_tokens(db, queue_id)
        waiting_count = len(waiting_tokens)

        # Current serving token details
        current_token = None
        if queue.get("current_serving_token_id"):
            current_token = TokenModel.find_by_id(db, queue["current_serving_token_id"])

        # Counters
        counters = CounterModel.list_by_department(db, queue["department_id"])

        return {
            "queue": queue,
            "waiting_count": waiting_count,
            "current_token": current_token,
            "counters": counters,
            "next_tokens": [t["token_number"] for t in waiting_tokens[:5]],
        }

    @staticmethod
    def _broadcast_queue_update(queue_id, event_name, payload):
        try:
            from app.sockets.queue_events import broadcast_queue_event
            broadcast_queue_event(queue_id, event_name, payload)
        except Exception as e:
            logger.debug(f"Socket broadcast deferred or skipped: {str(e)}")
