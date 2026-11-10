from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class DepartmentModel:
    COLLECTION_NAME = "departments"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        collection = cls.get_collection(db)
        # Department code must be unique within an organization
        collection.create_index([("organization_id", ASCENDING), ("code", ASCENDING)], unique=True)
        collection.create_index([("organization_id", ASCENDING), ("is_active", ASCENDING)])

    @classmethod
    def create(cls, db, organization_id, name, code, description=None):
        now = datetime.now(timezone.utc)
        doc = {
            "organization_id": ObjectId(organization_id),
            "name": name.strip(),
            "code": code.strip().upper(),
            "description": description.strip() if description else "",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    @classmethod
    def find_by_id(cls, db, department_id):
        if not department_id:
            return None
        try:
            oid = ObjectId(department_id) if isinstance(department_id, str) else department_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def list_by_organization(cls, db, organization_id, only_active=True):
        org_oid = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        query = {"organization_id": org_oid}
        if only_active:
            query["is_active"] = True
        cursor = cls.get_collection(db).find(query).sort("name", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def update(cls, db, department_id, update_data):
        oid = ObjectId(department_id) if isinstance(department_id, str) else department_id
        update_data["updated_at"] = datetime.now(timezone.utc)
        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_data})
        return cls.find_by_id(db, oid)
