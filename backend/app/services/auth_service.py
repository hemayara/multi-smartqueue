from flask_jwt_extended import create_access_token, create_refresh_token
from app.extensions import bcrypt, mongo
from app.models.user import UserModel, UserRole


class AuthService:
    """Handles authentication, password hashing, user registration, and JWT token issuance."""

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.generate_password_hash(password).decode("utf-8")

    @staticmethod
    def verify_password(password_hash: str, password: str) -> bool:
        if not password_hash or not password:
            return False
        return bcrypt.check_password_hash(password_hash, password)

    @classmethod
    def register_user(cls, email, password, full_name, role=UserRole.STUDENT,
                      organization_id=None, department_id=None, assigned_counter_id=None,
                      student_id=None, phone_number=None):
        """Register a new user account."""
        db = mongo.get_db()
        existing = UserModel.find_by_email(db, email)
        if existing:
            return None, "An account with this email address already exists."

        password_hash = cls.hash_password(password)
        created_user = UserModel.create(
            db,
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            role=role,
            organization_id=organization_id,
            department_id=department_id,
            assigned_counter_id=assigned_counter_id,
            student_id=student_id,
            phone_number=phone_number,
        )

        tokens = cls._generate_tokens_for_user(created_user)
        return {
            "user": created_user,
            "tokens": tokens,
        }, None

    @classmethod
    def login_user(cls, email, password):
        """Authenticate user credentials and return user details and JWT tokens."""
        db = mongo.get_db()
        raw_user = UserModel.find_raw_by_email(db, email)
        if not raw_user:
            return None, "Invalid email or password."

        if not raw_user.get("is_active", True):
            return None, "Account has been deactivated. Please contact administrator."

        if not cls.verify_password(raw_user.get("password_hash"), password):
            return None, "Invalid email or password."

        sanitized_user = UserModel.find_by_id(db, raw_user["_id"])
        tokens = cls._generate_tokens_for_user(sanitized_user)

        return {
            "user": sanitized_user,
            "tokens": tokens,
        }, None

    @classmethod
    def refresh_user_token(cls, user_id):
        """Generate a fresh access token from an authenticated refresh identity."""
        db = mongo.get_db()
        user = UserModel.find_by_id(db, user_id)
        if not user or not user.get("is_active"):
            return None, "User not found or inactive."

        access_token = create_access_token(
            identity=str(user["id"]),
            additional_claims={
                "id": str(user["id"]),
                "email": user["email"],
                "role": user["role"],
                "org_id": str(user.get("organization_id")) if user.get("organization_id") else None,
                "name": user.get("full_name"),
            }
        )
        return {"access_token": access_token}, None

    @classmethod
    def register_fcm_token(cls, user_id, fcm_token):
        """Add device token for push notifications."""
        db = mongo.get_db()
        UserModel.add_fcm_token(db, user_id, fcm_token)
        return True, None

    @classmethod
    def remove_fcm_token(cls, user_id, fcm_token):
        """Deregister device push token."""
        db = mongo.get_db()
        UserModel.remove_fcm_token(db, user_id, fcm_token)
        return True, None

    @staticmethod
    def _generate_tokens_for_user(user):
        """Helper to generate JWT access and refresh token pair."""
        user_id_str = str(user["id"])
        additional_claims = {
            "id": user_id_str,
            "email": user["email"],
            "role": user["role"],
            "org_id": str(user.get("organization_id")) if user.get("organization_id") else None,
            "name": user.get("full_name"),
        }
        access_token = create_access_token(identity=user_id_str, additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=user_id_str, additional_claims=additional_claims)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }
