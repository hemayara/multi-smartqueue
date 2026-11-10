from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class UserRole:
    ADMIN = "admin"
    STAFF = "staff"
    STUDENT = "student"
    ALL = [ADMIN, STAFF, STUDENT]


class UserModel:
    COLLECTION_NAME = "users"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        """Establish indexes for users: unique email, organization, and role."""
        collection = cls.get_collection(db)
        collection.create_index([("email", ASCENDING)], unique=True)
        collection.create_index([("organization_id", ASCENDING)])
        collection.create_index([("role", ASCENDING)])
        collection.create_index([("assigned_counter_id", ASCENDING)], sparse=True)

    @classmethod
    def create(cls, db, email, password_hash, full_name, role=UserRole.STUDENT,
               organization_id=None, department_id=None, assigned_counter_id=None,
               phone_number=None, student_id=None):
        """Create a new user document."""
        if role not in UserRole.ALL:
            raise ValueError(f"Invalid user role: {role}")

        now = datetime.now(timezone.utc)
        user_doc = {
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "full_name": full_name.strip(),
            "role": role,
            "organization_id": ObjectId(organization_id) if organization_id else None,
            "department_id": ObjectId(department_id) if department_id else None,
            "assigned_counter_id": ObjectId(assigned_counter_id) if assigned_counter_id else None,
            "phone_number": phone_number,
            "student_id": student_id,
            "fcm_tokens": [],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        return serialize_doc(user_doc)

    @classmethod
    def find_by_id(cls, db, user_id):
        if not user_id:
            return None
        try:
            oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def find_by_email(cls, db, email):
        if not email:
            return None
        doc = cls.get_collection(db).find_one({"email": email.strip().lower()})
        return serialize_doc(doc)

    @classmethod
    def find_raw_by_email(cls, db, email):
        """Returns raw doc including password_hash for authentication service verification."""
        if not email:
            return None
        return cls.get_collection(db).find_one({"email": email.strip().lower()})

    @classmethod
    def update(cls, db, user_id, update_data):
        """Update user document fields."""
        oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        update_data["updated_at"] = datetime.now(timezone.utc)

        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_data})
        return cls.find_by_id(db, oid)

    @classmethod
    def add_fcm_token(cls, db, user_id, fcm_token):
        """Add a device FCM push token uniquely to user."""
        oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {"$addToSet": {"fcm_tokens": fcm_token}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    @classmethod
    def remove_fcm_token(cls, db, user_id, fcm_token):
        """Remove a device FCM token."""
        oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {"$pull": {"fcm_tokens": fcm_token}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    @classmethod
    def list_by_organization(cls, db, organization_id, role=None):
        """List users belonging to an organization, optionally filtered by role."""
        org_oid = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        query = {"organization_id": org_oid}
        if role:
            query["role"] = role
        cursor = cls.get_collection(db).find(query).sort("full_name", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]
