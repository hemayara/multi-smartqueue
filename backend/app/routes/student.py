from flask import Blueprint, request
from app.extensions import mongo
from app.models.queue import QueueModel
from app.schemas.token_schema import JoinQueueSchema, CancelTokenSchema
from app.schemas import validate_schema
from app.services.token_service import TokenService
from app.utils.responses import success_response, error_response
from app.middleware.permissions import get_current_authenticated_user

student_bp = Blueprint("student", __name__)


@student_bp.route("/services", methods=["GET"])
def list_available_services():
    """List available service queues for an organization."""
    db = mongo.get_db()
    user = None
    try:
        user = get_current_authenticated_user()
    except Exception:
        pass

    org_id = request.args.get("organization_id")
    if not org_id and user:
        org_id = user.get("organization_id")

    if not org_id:
        from app.models.organization import OrganizationModel
        orgs = OrganizationModel.list_all(db, only_active=True)
        if orgs:
            org_id = orgs[0]["id"]
        else:
            return success_response({"services": []})

    queues = QueueModel.list_by_organization(db, org_id, only_active=True)
    return success_response({"services": queues})


@student_bp.route("/send-otp", methods=["POST"])
def send_otp():
    """Send 6-digit OTP verification code to mobile number."""
    from app.schemas.token_schema import SendOTPSchema
    from app.services.otp_service import OTPService

    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(SendOTPSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    result, err = OTPService.send_otp(validated["phone"])
    if err:
        return error_response(err, status_code=400)

    return success_response(result, message="OTP sent successfully to your mobile number")


@student_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    """Verify user-submitted OTP code for phone number."""
    from app.schemas.token_schema import VerifyOTPSchema
    from app.services.otp_service import OTPService

    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(VerifyOTPSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    success, err = OTPService.verify_otp(validated["phone"], validated["otp"])
    if not success:
        return error_response(err or "Invalid OTP", status_code=400)

    return success_response({"verified": True}, message="Mobile number verified successfully")


@student_bp.route("/join", methods=["POST"])
def join_queue():
    """Join a queue to receive a unique token with wait-time estimate."""
    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(JoinQueueSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    user = None
    try:
        user = get_current_authenticated_user()
    except Exception:
        pass

    # Support phone passed as phone, guest_phone, or from authenticated user profile
    phone = validated.get("phone") or validated.get("guest_phone") or data.get("phone") or data.get("guest_phone") or (user.get("phone_number") if user else None)
    guest_name = validated.get("guest_name") or data.get("guest_name") or (user.get("full_name") if user else None)

    # If an OTP is provided in the join request, verify it
    otp = validated.get("otp") or data.get("otp")
    if otp and phone:
        from app.services.otp_service import OTPService
        valid, otp_err = OTPService.verify_otp(phone, otp)
        if not valid:
            return error_response(otp_err, status_code=400, code="INVALID_OTP")

    token, err = TokenService.join_queue(
        queue_id=validated["queue_id"],
        user=user,
        guest_name=guest_name,
        guest_phone=phone,
    )
    if err:
        return error_response(err, status_code=400, code="QUEUE_JOIN_FAILED")

    return success_response({"token": token}, message="Joined queue successfully", status_code=201)


@student_bp.route("/token/<token_id>/test-sms", methods=["POST"])
def send_test_sms(token_id):
    """Trigger on-demand 5-minute approaching SMS alert."""
    from app.models.token import TokenModel
    from app.models.user import UserModel
    from app.services.notification_service import NotificationService

    db = mongo.get_db()
    token = TokenModel.find_by_id(db, token_id)
    if not token:
        return error_response("Token not found", status_code=404)

    data = request.get_json(silent=True) or {}
    phone = data.get("phone") or token.get("guest_phone")

    user_id = token.get("user_id")
    if not phone and user_id:
        user = UserModel.find_by_id(db, user_id)
        if user:
            phone = user.get("phone_number")

    if not phone:
        phone = "+91 98765 43210"

    token_num = token.get("token_number")
    msg = f"🔔 SmartQueue Alert: Token {token_num} is coming in ~5 minutes! Next token is yours. Please head to your Hospital/Bank/Counter immediately. (మీ టోకెన్ {token_num} 5 నిమిషాల్లో రాబోతుంది, తదుపరి టోకెన్ మీదే! దయచేసి కౌంటర్ వద్దకు వెళ్ళండి)."

    NotificationService.send_sms_notification(phone, msg, token_id=token["id"], user_id=user_id)

    # Broadcast socket event
    try:
        from app.extensions import socketio
        socketio.emit(
            "token:approaching",
            {
                "token_id": token["id"],
                "token_number": token_num,
                "phone": phone,
                "message": msg,
                "position_ahead": 1,
            },
            room=f"queue_{token.get('queue_id')}",
        )
    except Exception:
        pass

    return success_response({
        "phone": phone,
        "message": msg,
        "status": "SMS Dispatched"
    }, message="SMS alert dispatched successfully!")


@student_bp.route("/active-token", methods=["GET"])
def get_active_token():
    """Retrieve user's active token and live wait-time estimate."""
    try:
        user = get_current_authenticated_user()
    except Exception:
        return error_response("Authentication required", status_code=401)

    queue_id = request.args.get("queue_id")
    token, err = TokenService.get_user_active_token(user["id"], queue_id=queue_id)
    if err:
        return error_response(err, status_code=400)

    return success_response({"active_token": token})


@student_bp.route("/token/<token_id>", methods=["GET"])
def get_token_status(token_id):
    """Retrieve details, live position, and wait time for a specific token."""
    user = None
    try:
        user = get_current_authenticated_user()
    except Exception:
        pass

    token, err = TokenService.get_token_details(token_id, user=user)
    if err:
        return error_response(err, status_code=404 if "not found" in err.lower() else 403)

    return success_response({"token": token})


@student_bp.route("/token/<token_id>/cancel", methods=["POST"])
def cancel_token(token_id):
    """Cancel an active token."""
    user = None
    try:
        user = get_current_authenticated_user()
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    validated, _ = validate_schema(CancelTokenSchema(), data)
    reason = validated.get("reason", "Cancelled by user") if validated else "Cancelled by user"

    updated, err = TokenService.cancel_token(token_id, user=user, reason=reason)
    if err:
        return error_response(err, status_code=400)

    return success_response({"token": updated}, message="Token cancelled successfully")


@student_bp.route("/history", methods=["GET"])
def get_token_history():
    """Retrieve historical and active tokens for the student."""
    try:
        user = get_current_authenticated_user()
    except Exception:
        return error_response("Authentication required", status_code=401)

    limit = int(request.args.get("limit", 20))
    tokens, err = TokenService.get_user_token_history(user["id"], limit=limit)
    if err:
        return error_response(err, status_code=400)

    return success_response({"tokens": tokens})
