from flask import Blueprint, request
from app.extensions import mongo
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.counter import CounterModel
from app.models.queue import QueueModel
from app.models.token import TokenModel, TokenStatus
from app.models.user import UserModel, UserRole
from app.utils.responses import success_response, error_response
from app.middleware.permissions import role_required, get_current_authenticated_user

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/organizations", methods=["GET", "POST"])
@role_required([UserRole.ADMIN])
def manage_organizations():
    """List or create organizations."""
    db = mongo.get_db()
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        name = data.get("name")
        code = data.get("code")
        if not name or not code:
            return error_response("Organization name and code are required", status_code=400)

        existing = OrganizationModel.find_by_code(db, code)
        if existing:
            return error_response("An organization with this code already exists", status_code=400)

        org = OrganizationModel.create(
            db,
            name=name,
            code=code,
            contact_email=data.get("contact_email"),
            working_hours=data.get("working_hours"),
            settings=data.get("settings"),
        )
        return success_response({"organization": org}, message="Organization created", status_code=201)

    orgs = OrganizationModel.list_all(db, only_active=False)
    return success_response({"organizations": orgs})


@admin_bp.route("/departments", methods=["GET", "POST"])
@role_required([UserRole.ADMIN])
def manage_departments():
    """List or create departments for an organization."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = request.args.get("organization_id") or user.get("organization_id")

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        target_org = data.get("organization_id") or org_id
        if not target_org or not data.get("name") or not data.get("code"):
            return error_response("organization_id, name, and code are required", status_code=400)

        dept = DepartmentModel.create(
            db,
            organization_id=target_org,
            name=data["name"],
            code=data["code"],
            description=data.get("description"),
        )
        return success_response({"department": dept}, message="Department created", status_code=201)

    if not org_id:
        return error_response("organization_id is required", status_code=400)

    depts = DepartmentModel.list_by_organization(db, org_id, only_active=False)
    return success_response({"departments": depts})


@admin_bp.route("/counters", methods=["GET", "POST"])
@role_required([UserRole.ADMIN])
def manage_counters():
    """List or create service counters."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = request.args.get("organization_id") or user.get("organization_id")

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        target_org = data.get("organization_id") or org_id
        if not target_org or not data.get("department_id") or not data.get("name") or not data.get("counter_number"):
            return error_response("organization_id, department_id, name, and counter_number are required", status_code=400)

        counter = CounterModel.create(
            db,
            organization_id=target_org,
            department_id=data["department_id"],
            name=data["name"],
            counter_number=data["counter_number"],
            assigned_staff_id=data.get("assigned_staff_id"),
        )
        return success_response({"counter": counter}, message="Counter created", status_code=201)

    if not org_id:
        return error_response("organization_id is required", status_code=400)

    counters = CounterModel.list_by_organization(db, org_id, only_active=False)
    return success_response({"counters": counters})


@admin_bp.route("/queues", methods=["GET", "POST"])
@role_required([UserRole.ADMIN])
def manage_queues():
    """List or create queues with operating hours, limits, and QR code identifiers."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = request.args.get("organization_id") or user.get("organization_id")

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        target_org = data.get("organization_id") or org_id
        if not target_org or not data.get("department_id") or not data.get("name") or not data.get("code"):
            return error_response("organization_id, department_id, name, and code are required", status_code=400)

        queue = QueueModel.create(
            db,
            organization_id=target_org,
            department_id=data["department_id"],
            name=data["name"],
            code=data["code"],
            prefix=data.get("prefix", "TKN"),
            estimated_service_time=data.get("estimated_service_time", 5),
            max_daily_capacity=data.get("max_daily_capacity", 200),
            operating_hours=data.get("operating_hours"),
        )
        return success_response({"queue": queue}, message="Queue created", status_code=201)

    if not org_id:
        return error_response("organization_id is required", status_code=400)

    queues = QueueModel.list_by_organization(db, org_id, only_active=False)
    return success_response({"queues": queues})


@admin_bp.route("/staff", methods=["GET"])
@role_required([UserRole.ADMIN])
def list_staff_members():
    """List staff accounts for assignment."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = request.args.get("organization_id") or user.get("organization_id")
    if not org_id:
        return error_response("organization_id is required", status_code=400)

    staff_list = UserModel.list_by_organization(db, org_id, role=UserRole.STAFF)
    return success_response({"staff": staff_list})


@admin_bp.route("/assign-staff", methods=["POST"])
@role_required([UserRole.ADMIN])
def assign_staff():
    """Assign staff member to a counter."""
    data = request.get_json(silent=True) or {}
    counter_id = data.get("counter_id")
    staff_id = data.get("staff_id")
    if not counter_id:
        return error_response("counter_id is required", status_code=400)

    db = mongo.get_db()
    counter = CounterModel.assign_staff(db, counter_id, staff_id)
    if staff_id:
        UserModel.update(db, staff_id, {"assigned_counter_id": counter_id})

    return success_response({"counter": counter}, message="Staff assigned to counter successfully")


@admin_bp.route("/reports", methods=["GET"])
@role_required([UserRole.ADMIN])
def get_analytics_report():
    """Generate operational analytics report across queues and tokens."""
    db = mongo.get_db()
    user = get_current_authenticated_user()
    org_id = request.args.get("organization_id") or user.get("organization_id")
    if not org_id:
        return error_response("organization_id is required", status_code=400)

    tokens_coll = TokenModel.get_collection(db)
    from bson import ObjectId
    match_query = {"organization_id": ObjectId(org_id)} if ObjectId.is_valid(org_id) else {}

    total_tokens = tokens_coll.count_documents(match_query)
    completed_tokens = tokens_coll.count_documents({**match_query, "status": TokenStatus.COMPLETED})
    cancelled_tokens = tokens_coll.count_documents({**match_query, "status": TokenStatus.CANCELLED})
    skipped_tokens = tokens_coll.count_documents({**match_query, "status": TokenStatus.SKIPPED})
    waiting_tokens = tokens_coll.count_documents({**match_query, "status": TokenStatus.WAITING})
    serving_tokens = tokens_coll.count_documents({**match_query, "status": TokenStatus.SERVING})

    completion_rate = round((completed_tokens / total_tokens * 100), 1) if total_tokens > 0 else 0.0

    return success_response({
        "summary": {
            "total_tokens": total_tokens,
            "completed": completed_tokens,
            "cancelled": cancelled_tokens,
            "skipped": skipped_tokens,
            "waiting": waiting_tokens,
            "serving": serving_tokens,
            "completion_rate_percent": completion_rate,
        }
    }, message="Operational report generated")
