import logging
from app.extensions import mongo
from app.models.token import TokenModel, TokenStatus
from app.models.queue import QueueModel, QueueStatus
from app.models.organization import OrganizationModel
from app.models.counter import CounterModel
from app.services.wait_time_service import WaitTimeService
from app.middleware.permissions import check_token_ownership

logger = logging.getLogger("smartqueue.tokens")


class TokenService:
    """Manages student token allocation, status inspection, live positioning, and cancellation."""

    @classmethod
    def join_queue(cls, queue_id, user=None, guest_name=None, guest_phone=None):
        """Join a queue and allocate a guaranteed unique atomic token."""
        db = mongo.get_db()

        # 1. Validate queue existence and active status
        queue = QueueModel.find_by_id(db, queue_id)
        if not queue or not queue.get("is_active"):
            return None, "The requested queue does not exist or is inactive."

        if queue.get("status") == QueueStatus.CLOSED:
            return None, "This queue is currently closed."

        # 2. Check Organization policy regarding duplicate active tokens
        org = OrganizationModel.find_by_id(db, queue["organization_id"])
        allow_concurrent = org.get("settings", {}).get("allow_concurrent_tokens", False) if org else False

        user_id = user.get("id") if user else None
        if user_id and not allow_concurrent:
            active_token = TokenModel.check_user_active_token(db, user_id, queue_id=queue["id"])
            if active_token:
                return None, f"You already have an active token ({active_token['token_number']}) in this queue."

        # 3. Check daily capacity
        today_date = queue.get("updated_at", "").split("T")[0] if isinstance(queue.get("updated_at"), str) else ""
        # Let's count today's tokens for this queue
        current_daily_count = TokenModel.get_collection(db).count_documents({"queue_id": queue_id})
        max_capacity = queue.get("max_daily_capacity", 200)
        if current_daily_count >= max_capacity:
            return None, f"Daily limit reached for this queue ({max_capacity} tokens max)."

        # 4. Atomically create token
        prefix = queue.get("prefix", "TKN")
        token = TokenModel.create(
            db,
            organization_id=queue["organization_id"],
            department_id=queue["department_id"],
            queue_id=queue["id"],
            prefix=prefix,
            user_id=user_id,
            guest_name=guest_name,
            guest_phone=guest_phone,
        )

        # 5. Enrich with real-time estimation
        estimate = WaitTimeService.estimate_for_token(token)
        token["estimation"] = estimate
        token["queue_name"] = queue.get("name")

        # 6. Broadcast socket update (defensively imported to avoid circular dependencies)
        cls._broadcast_queue_update(queue["id"], "token:created", token)

        return token, None

    @classmethod
    def get_token_details(cls, token_id, user=None):
        """Fetch token with current live queue positioning and wait time estimate."""
        db = mongo.get_db()
        token = TokenModel.find_by_id(db, token_id)
        if not token:
            return None, "Token not found."

        # Permission check: if user is provided, verify access
        if user and not check_token_ownership(token, user):
            return None, "Unauthorized access to token."

        queue = QueueModel.find_by_id(db, token["queue_id"])
        token["queue_name"] = queue.get("name") if queue else "Unknown Queue"
        token["queue_status"] = queue.get("status") if queue else "unknown"

        if token.get("counter_id"):
            counter = CounterModel.find_by_id(db, token["counter_id"])
            token["counter_name"] = counter.get("name") if counter else f"Counter {counter.get('counter_number')}"
            token["counter_number"] = counter.get("counter_number") if counter else None

        token["estimation"] = WaitTimeService.estimate_for_token(token)
        return token, None

    @classmethod
    def cancel_token(cls, token_id, user=None, reason="Cancelled by user"):
        """Cancel an active waiting or called token."""
        db = mongo.get_db()
        token = TokenModel.find_by_id(db, token_id)
        if not token:
            return None, "Token not found."

        if user and not check_token_ownership(token, user):
            return None, "You do not have permission to cancel this token."

        if token.get("status") not in [TokenStatus.WAITING, TokenStatus.CALLED]:
            return None, f"Cannot cancel token with status '{token.get('status')}'. Only waiting or called tokens can be cancelled."

        updated_token = TokenModel.update_status(
            db,
            token_id=token["id"],
            new_status=TokenStatus.CANCELLED,
            reason=reason,
        )

        # Broadcast update
        cls._broadcast_queue_update(token["queue_id"], "token:cancelled", updated_token)

        return updated_token, None

    @classmethod
    def get_user_token_history(cls, user_id, limit=20):
        """Retrieve token history for a student."""
        db = mongo.get_db()
        tokens = TokenModel.list_user_tokens(db, user_id, limit=limit)
        for t in tokens:
            t["estimation"] = WaitTimeService.estimate_for_token(t)
        return tokens, None

    @classmethod
    def get_user_active_token(cls, user_id, queue_id=None):
        """Retrieve student's currently active token if any exists."""
        db = mongo.get_db()
        token = TokenModel.check_user_active_token(db, user_id, queue_id=queue_id)
        if token:
            token["estimation"] = WaitTimeService.estimate_for_token(token)
            queue = QueueModel.find_by_id(db, token["queue_id"])
            token["queue_name"] = queue.get("name") if queue else ""
            if token.get("counter_id"):
                counter = CounterModel.find_by_id(db, token["counter_id"])
                token["counter_name"] = counter.get("name") if counter else ""
        return token, None

    @staticmethod
    def _broadcast_queue_update(queue_id, event_name, payload):
        """Dispatch real-time WebSocket update to subscribers of the queue room."""
        try:
            from app.sockets.queue_events import broadcast_queue_event
            broadcast_queue_event(queue_id, event_name, payload)
        except Exception as e:
            logger.debug(f"Socket broadcast deferred or skipped: {str(e)}")
