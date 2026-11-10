from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class CounterStatus:
    OPEN = "open"
    BUSY = "busy"
    CLOSED = "closed"
    ALL = [OPEN, BUSY, CLOSED]


class CounterModel:
    COLLECTION_NAME = "counters"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        collection = cls.get_collection(db)
        # Counter number must be unique within an organization
        collection.create_index([("organization_id", ASCENDING), ("counter_number", ASCENDING)], unique=True)
        collection.create_index([("organization_id", ASCENDING), ("department_id", ASCENDING)])
        collection.create_index([("assigned_staff_id", ASCENDING)], sparse=True)
        collection.create_index([("status", ASCENDING)])

    @classmethod
    def create(cls, db, organization_id, department_id, name, counter_number, assigned_staff_id=None):
        now = datetime.now(timezone.utc)
        doc = {
            "organization_id": ObjectId(organization_id),
            "department_id": ObjectId(department_id),
            "name": name.strip(),
            "counter_number": int(counter_number),
            "assigned_staff_id": ObjectId(assigned_staff_id) if assigned_staff_id else None,
            "status": CounterStatus.CLOSED,
            "current_token_id": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    @classmethod
    def find_by_id(cls, db, counter_id):
        if not counter_id:
            return None
        try:
            oid = ObjectId(counter_id) if isinstance(counter_id, str) else counter_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def list_by_department(cls, db, department_id, only_active=True):
        dept_oid = ObjectId(department_id) if isinstance(department_id, str) else department_id
        query = {"department_id": dept_oid}
        if only_active:
            query["is_active"] = True
        cursor = cls.get_collection(db).find(query).sort("counter_number", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def list_by_organization(cls, db, organization_id, only_active=True):
        org_oid = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        query = {"organization_id": org_oid}
        if only_active:
            query["is_active"] = True
        cursor = cls.get_collection(db).find(query).sort("counter_number", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def update_status(cls, db, counter_id, status, current_token_id=None):
        if status not in CounterStatus.ALL:
            raise ValueError(f"Invalid counter status: {status}")

        oid = ObjectId(counter_id) if isinstance(counter_id, str) else counter_id
        update_data = {
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        }
        if current_token_id is not None:
            update_data["current_token_id"] = (
                ObjectId(current_token_id) if current_token_id else None
            )

        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_data})
        return cls.find_by_id(db, oid)

    @classmethod
    def assign_staff(cls, db, counter_id, staff_id):
        oid = ObjectId(counter_id) if isinstance(counter_id, str) else counter_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {
                "$set": {
                    "assigned_staff_id": ObjectId(staff_id) if staff_id else None,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        return cls.find_by_id(db, oid)
