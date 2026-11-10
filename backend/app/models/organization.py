from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class OrganizationModel:
    COLLECTION_NAME = "organizations"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        collection = cls.get_collection(db)
        collection.create_index([("code", ASCENDING)], unique=True)
        collection.create_index([("is_active", ASCENDING)])

    @classmethod
    def create(cls, db, name, code, contact_email=None, working_hours=None, settings=None):
        """Create a new organization."""
        now = datetime.now(timezone.utc)
        doc = {
            "name": name.strip(),
            "code": code.strip().upper(),
            "contact_email": contact_email.strip().lower() if contact_email else None,
            "working_hours": working_hours or {
                "start": "09:00",
                "end": "17:00",
                "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]
            },
            "settings": settings or {
                "allow_concurrent_tokens": False,
                "auto_call_next": False,
                "default_estimated_service_time": 5,
                "max_daily_tokens_per_student": 3
            },
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    @classmethod
    def find_by_id(cls, db, org_id):
        if not org_id:
            return None
        try:
            oid = ObjectId(org_id) if isinstance(org_id, str) else org_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def find_by_code(cls, db, code):
        if not code:
            return None
        doc = cls.get_collection(db).find_one({"code": code.strip().upper()})
        return serialize_doc(doc)

    @classmethod
    def list_all(cls, db, only_active=True):
        query = {"is_active": True} if only_active else {}
        cursor = cls.get_collection(db).find(query).sort("name", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def update(cls, db, org_id, update_data):
        oid = ObjectId(org_id) if isinstance(org_id, str) else org_id
        update_data["updated_at"] = datetime.now(timezone.utc)
        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_data})
        return cls.find_by_id(db, oid)
