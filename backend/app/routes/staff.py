from flask import Blueprint, request
from app.extensions import mongo
from app.models.queue import QueueModel, QueueStatus
from app.models.counter import CounterModel, CounterStatus
from app.models.user import UserRole
from app.schemas.token_schema import (
    CallNextTokenSchema,
    UpdateCounterStatusSchema,
    UpdateQueueStatusSchema,
)
from app.schemas import validate_schema
from app.services.queue_service import QueueService
from app.utils.responses import success_response, error_response
from app.middleware.permissions import role_required, get_current_authenticated_user

staff_bp = Blueprint("staff", __name__)


@staff_bp.route("/queues", methods=["GET"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def get_staff_queues():
    """List queues for staff operations."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = user.get("organization_id")
    dept_id = user.get("department_id")

    queues = QueueModel.list_by_organization(db, org_id, department_id=dept_id, only_active=True)
    return success_response({"queues": queues})


@staff_bp.route("/counters", methods=["GET"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def get_staff_counters():
    """List counters for staff selection."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = user.get("organization_id")
    dept_id = user.get("department_id")

    if dept_id:
        counters = CounterModel.list_by_department(db, dept_id, only_active=True)
    else:
        counters = CounterModel.list_by_organization(db, org_id, only_active=True)

    return success_response({
        "counters": counters,
        "assigned_counter_id": user.get("assigned_counter_id"),
    })


@staff_bp.route("/call-next", methods=["POST"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def call_next():
    """Call the next waiting token in the queue to a counter."""
    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(CallNextTokenSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    user = get_current_authenticated_user()
    token, err = QueueService.call_next_token(
        queue_id=validated["queue_id"],
        counter_id=validated["counter_id"],
        staff_user=user,
    )
    if err:
        return error_response(err, status_code=400, code="CALL_NEXT_FAILED")

    return success_response({"token": token}, message="Next token called successfully")


@staff_bp.route("/start-service", methods=["POST"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def start_service():
    """Start servicing a called token."""
    data = request.get_json(silent=True) or {}
    token_id = data.get("token_id")
    if not token_id:
        return error_response("token_id is required", status_code=400)

    user = get_current_authenticated_user()
    updated, err = QueueService.start_service(token_id, staff_user=user)
    if err:
        return error_response(err, status_code=400)

    return success_response({"token": updated}, message="Service started")


@staff_bp.route("/complete-service", methods=["POST"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def complete_service():
    """Mark token as completed and release counter."""
    data = request.get_json(silent=True) or {}
    token_id = data.get("token_id")
    counter_id = data.get("counter_id")
    if not token_id:
        return error_response("token_id is required", status_code=400)

    user = get_current_authenticated_user()
    updated, err = QueueService.complete_service(token_id, counter_id, staff_user=user)
    if err:
        return error_response(err, status_code=400)

    return success_response({"token": updated}, message="Service completed successfully")


@staff_bp.route("/skip-token", methods=["POST"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def skip_token():
    """Mark token as skipped / no-show and free the counter."""
    data = request.get_json(silent=True) or {}
    token_id = data.get("token_id")
    counter_id = data.get("counter_id")
    reason = data.get("reason", "Student did not show up")

    if not token_id:
        return error_response("token_id is required", status_code=400)

    user = get_current_authenticated_user()
    updated, err = QueueService.skip_token(token_id, counter_id, staff_user=user, reason=reason)
    if err:
        return error_response(err, status_code=400)

    return success_response({"token": updated}, message="Token skipped successfully")


@staff_bp.route("/counter/status", methods=["PUT"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def update_counter_status():
    """Update counter availability status."""
    data = request.get_json(silent=True) or {}
    counter_id = data.get("counter_id")
    if not counter_id:
        return error_response("counter_id is required", status_code=400)

    validated, errors = validate_schema(UpdateCounterStatusSchema(), {"status": data.get("status")})
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    db = mongo.get_db()
    updated = CounterModel.update_status(db, counter_id, validated["status"])
    return success_response({"counter": updated}, message="Counter status updated")


@staff_bp.route("/queue/<queue_id>/status", methods=["PUT"])
@role_required([UserRole.STAFF, UserRole.ADMIN])
def update_queue_status(queue_id):
    """Pause or resume a queue."""
    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(UpdateQueueStatusSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    user = get_current_authenticated_user()
    new_status = validated["status"]
    if new_status == QueueStatus.PAUSED:
        updated, err = QueueService.pause_queue(queue_id, staff_user=user)
    elif new_status == QueueStatus.ACTIVE:
        updated, err = QueueService.resume_queue(queue_id, staff_user=user)
    else:
        db = mongo.get_db()
        updated = QueueModel.update_status(db, queue_id, new_status)
        err = None

    if err:
        return error_response(err, status_code=400)

    return success_response({"queue": updated}, message=f"Queue status updated to {new_status}")
