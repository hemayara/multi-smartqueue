from functools import wraps
from flask import g, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.extensions import mongo
from app.models.user import UserModel, UserRole
from app.utils.responses import error_response


def get_current_authenticated_user():
    """Retrieve the active authenticated user from the request JWT token."""
    verify_jwt_in_request()
    identity = get_jwt_identity()
    user_id = identity.get("id") if isinstance(identity, dict) else identity

    if hasattr(g, "current_user") and g.current_user is not None:
        if str(g.current_user.get("id")) == str(user_id):
            return g.current_user

    db = mongo.get_db()
    user = UserModel.find_by_id(db, user_id)
    if not user or not user.get("is_active"):
        return None

    g.current_user = user
    return user


def role_required(allowed_roles):
    """Decorator to restrict route execution to specific user roles.
    
    Args:
        allowed_roles: A string or list/tuple of strings (e.g. ['admin', 'staff'])
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                user = get_current_authenticated_user()
            except Exception as e:
                return error_response("Authentication required", status_code=401, details=str(e), code="UNAUTHENTICATED")

            if not user:
                return error_response("User account is inactive or not found", status_code=401, code="USER_INACTIVE")

            user_role = user.get("role")
            if user_role not in allowed_roles:
                return error_response(
                    f"Access forbidden: requires one of {allowed_roles} roles",
                    status_code=403,
                    code="FORBIDDEN_ROLE"
                )

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def organization_isolated(fn):
    """Enforce multi-tenant data isolation.
    
    Verifies that the requested organization_id (from JSON body, query params, or URL kwargs)
    matches the authenticated user's organization. Admins without organization_id are allowed
    as global superadmins.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_current_authenticated_user()
        if not user:
            return error_response("Authentication required", status_code=401)

        user_org_id = user.get("organization_id")
        
        # If user has no organization_id and is admin, they are global superadmin
        if not user_org_id and user.get("role") == UserRole.ADMIN:
            return fn(*args, **kwargs)

        target_org_id = (
            kwargs.get("org_id")
            or kwargs.get("organization_id")
            or request.args.get("organization_id")
            or (request.is_json and request.get_json(silent=True) and request.get_json().get("organization_id"))
        )

        if target_org_id and str(target_org_id) != str(user_org_id):
            return error_response(
                "Access denied: You cannot access or modify resources of another organization",
                status_code=403,
                code="ORGANIZATION_MISMATCH"
            )

        return fn(*args, **kwargs)
    return wrapper


def check_token_ownership(token, user):
    """Validate whether the user is permitted to view or cancel the given token.
    
    Returns True if user is admin, staff of the same organization, or the owner student.
    """
    if not token or not user:
        return False

    role = user.get("role")
    if role == UserRole.ADMIN:
        return True

    if role == UserRole.STAFF:
        return str(token.get("organization_id")) == str(user.get("organization_id"))

    # Student check: must match user_id
    token_user_id = token.get("user_id")
    return token_user_id and str(token_user_id) == str(user.get("id"))
