from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.schemas.auth_schema import RegisterSchema, LoginSchema, FCMTokenSchema
from app.schemas import validate_schema
from app.services.auth_service import AuthService
from app.utils.responses import success_response, error_response
from app.middleware.permissions import get_current_authenticated_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user account."""
    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(RegisterSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors, code="VALIDATION_ERROR")

    result, err = AuthService.register_user(
        email=validated["email"],
        password=validated["password"],
        full_name=validated["full_name"],
        role=validated.get("role"),
        organization_id=validated.get("organization_id"),
        department_id=validated.get("department_id"),
        assigned_counter_id=validated.get("assigned_counter_id"),
        student_id=validated.get("student_id"),
        phone_number=validated.get("phone_number"),
    )
    if err:
        return error_response(err, status_code=400, code="REGISTRATION_FAILED")

    return success_response(result, message="User registered successfully", status_code=201)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate credentials and return JWT tokens."""
    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(LoginSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors, code="VALIDATION_ERROR")

    result, err = AuthService.login_user(validated["email"], validated["password"])
    if err:
        return error_response(err, status_code=401, code="AUTHENTICATION_FAILED")

    return success_response(result, message="Logged in successfully", status_code=200)


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """Generate fresh access token using a valid refresh token."""
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity
    result, err = AuthService.refresh_user_token(user_id)
    if err:
        return error_response(err, status_code=401, code="REFRESH_FAILED")

    return success_response(result, message="Access token refreshed", status_code=200)


@auth_bp.route("/me", methods=["GET"])
def get_current_user_profile():
    """Get active user profile."""
    try:
        user = get_current_authenticated_user()
    except Exception as e:
        return error_response("Authentication required", status_code=401, details=str(e))

    if not user:
        return error_response("User not found or inactive", status_code=401)

    return success_response({"user": user}, message="User profile retrieved", status_code=200)


@auth_bp.route("/fcm-token", methods=["POST"])
def register_fcm():
    """Register device FCM push notification token."""
    try:
        user = get_current_authenticated_user()
    except Exception:
        return error_response("Authentication required", status_code=401)

    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(FCMTokenSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    AuthService.register_fcm_token(user["id"], validated["fcm_token"])
    return success_response(message="FCM token registered successfully")


@auth_bp.route("/fcm-token", methods=["DELETE"])
def remove_fcm():
    """Deregister device FCM push notification token."""
    try:
        user = get_current_authenticated_user()
    except Exception:
        return error_response("Authentication required", status_code=401)

    data = request.get_json(silent=True) or {}
    validated, errors = validate_schema(FCMTokenSchema(), data)
    if errors:
        return error_response("Validation error", status_code=400, details=errors)

    AuthService.remove_fcm_token(user["id"], validated["fcm_token"])
    return success_response(message="FCM token removed successfully")
