import logging
from app.extensions import mongo
from app.models.token import TokenModel, TokenStatus
from app.models.queue import QueueModel, QueueStatus
from app.models.counter import CounterModel, CounterStatus

logger = logging.getLogger("smartqueue.wait_time")


class WaitTimeService:
    """Calculates queue positions and algorithmic wait-time estimates."""

    @classmethod
    def estimate_for_token(cls, token):
        """Calculate the estimated wait time and position ahead for a given token."""
        if not token or token.get("status") != TokenStatus.WAITING:
            return {
                "position_ahead": 0,
                "estimated_wait_minutes": 0,
                "active_counters": 0,
                "is_estimate": True,
                "status_note": f"Token is {token.get('status') if token else 'unknown'}",
            }

        db = mongo.get_db()
        queue_id = token["queue_id"]
        sequence_number = token["sequence_number"]
        service_date = token["service_date"]

        # 1. Fetch queue configuration
        queue = QueueModel.find_by_id(db, queue_id)
        if not queue:
            return cls._fallback_response(0, "Queue not found")

        # 2. Check if queue is paused or closed
        queue_status = queue.get("status", QueueStatus.ACTIVE)
        if queue_status == QueueStatus.PAUSED:
            ahead = TokenModel.count_ahead_in_queue(db, queue_id, sequence_number, service_date)
            return {
                "position_ahead": ahead,
                "estimated_wait_minutes": None,
                "active_counters": 0,
                "is_estimate": True,
                "status_note": "Queue is currently PAUSED by staff. Estimations will resume once queue restarts.",
            }

        if queue_status == QueueStatus.CLOSED:
            return {
                "position_ahead": 0,
                "estimated_wait_minutes": 0,
                "active_counters": 0,
                "is_estimate": True,
                "status_note": "Queue is CLOSED for the day.",
            }

        # 3. Count waiting tokens ahead of this token
        position_ahead = TokenModel.count_ahead_in_queue(db, queue_id, sequence_number, service_date)

        # 4. Count active (OPEN or BUSY) counters assigned to this department
        department_id = queue["department_id"]
        counters = CounterModel.list_by_department(db, department_id, only_active=True)
        active_counters = sum(1 for c in counters if c.get("status") in [CounterStatus.OPEN, CounterStatus.BUSY])

        # 5. Get base service time per token
        avg_service_time = queue.get("estimated_service_time", 5)

        # 6. Compute wait time estimate
        if active_counters == 0:
            return {
                "position_ahead": position_ahead,
                "estimated_wait_minutes": None,
                "active_counters": 0,
                "is_estimate": True,
                "status_note": "No counters currently online. Staff will begin calling shortly.",
            }

        # Formula: (People Ahead / Active Counters) * Average Service Time
        estimated_minutes = round(((position_ahead + 1) / active_counters) * avg_service_time)
        if position_ahead == 0:
            estimated_minutes = max(1, round(avg_service_time / 2))

        return {
            "position_ahead": position_ahead,
            "estimated_wait_minutes": estimated_minutes,
            "active_counters": active_counters,
            "is_estimate": True,
            "status_note": "Calculated based on current active counters and service averages.",
        }

    @staticmethod
    def _fallback_response(position, note):
        return {
            "position_ahead": position,
            "estimated_wait_minutes": None,
            "active_counters": 0,
            "is_estimate": True,
            "status_note": note,
        }
