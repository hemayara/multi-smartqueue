from flask import Blueprint, request
from app.extensions import mongo
from app.models.queue import QueueModel
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.services.queue_service import QueueService
from app.utils.responses import success_response, error_response

queue_bp = Blueprint("queue", __name__)


@queue_bp.route("/status/<queue_id>", methods=["GET"])
def get_public_queue_status(queue_id):
    """Retrieve public live queue status (safe for public monitors and visitor apps)."""
    status_data = QueueService.get_queue_status(queue_id)
    if not status_data:
        return error_response("Queue not found", status_code=404)

    # Sanitize current token to hide PII
    current_token = status_data.get("current_token")
    sanitized_current = None
    if current_token:
        sanitized_current = {
            "token_number": current_token.get("token_number"),
            "status": current_token.get("status"),
            "called_at": current_token.get("called_at"),
            "counter_id": current_token.get("counter_id"),
        }

    queue_doc = status_data["queue"]
    return success_response({
        "queue_id": queue_doc.get("id"),
        "name": queue_doc.get("name"),
        "code": queue_doc.get("code"),
        "status": queue_doc.get("status"),
        "waiting_count": status_data["waiting_count"],
        "current_token": sanitized_current,
        "next_tokens": status_data["next_tokens"],
        "counters": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "counter_number": c.get("counter_number"),
                "status": c.get("status"),
            }
            for c in status_data.get("counters", [])
        ]
    })


@queue_bp.route("/qr/<qr_hash>", methods=["GET"])
def get_queue_by_qr(qr_hash):
    """Validate QR code hash and return queue joining metadata."""
    db = mongo.get_db()
    queue = QueueModel.find_by_qr_hash(db, qr_hash)
    if not queue:
        return error_response("Invalid or expired QR code", status_code=404, code="INVALID_QR")

    org = OrganizationModel.find_by_id(db, queue["organization_id"])
    dept = DepartmentModel.find_by_id(db, queue["department_id"])

    return success_response({
        "queue": queue,
        "organization": {
            "id": org.get("id") if org else None,
            "name": org.get("name") if org else "Unknown Organization",
            "code": org.get("code") if org else "",
        },
        "department": {
            "id": dept.get("id") if dept else None,
            "name": dept.get("name") if dept else "General Service",
        }
    }, message="Queue QR code verified successfully")


@queue_bp.route("/public/list", methods=["GET"])
def list_public_queues():
    """List open queues for an organization or department."""
    db = mongo.get_db()
    org_id = request.args.get("organization_id")
    dept_id = request.args.get("department_id")

    if not org_id:
        # Return all active organizations if org not selected
        orgs = OrganizationModel.list_all(db, only_active=True)
        if orgs:
            org_id = orgs[0]["id"]
        else:
            return success_response({"queues": []})

    queues = QueueModel.list_by_organization(db, org_id, department_id=dept_id, only_active=True)
    return success_response({"queues": queues})
