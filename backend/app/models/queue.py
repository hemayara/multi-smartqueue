from datetime import datetime, timezone
import hashlib
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class QueueStatus:
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"
    ALL = [ACTIVE, PAUSED, CLOSED]


class QueueModel:
    COLLECTION_NAME = "queues"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        collection = cls.get_collection(db)
        # Queue code must be unique within an organization
        collection.create_index([("organization_id", ASCENDING), ("code", ASCENDING)], unique=True)
        collection.create_index([("organization_id", ASCENDING), ("department_id", ASCENDING)])
        collection.create_index([("status", ASCENDING)])
        collection.create_index([("qr_code_hash", ASCENDING)], unique=True, sparse=True)

    @classmethod
    def create(cls, db, organization_id, department_id, name, code, prefix="TKN",
               estimated_service_time=5, max_daily_capacity=200, operating_hours=None):
        now = datetime.now(timezone.utc)
        clean_code = code.strip().upper()
        clean_prefix = prefix.strip().upper()

        # Generate unique tamper-resistant QR hash identifier
        raw_seed = f"{organization_id}:{clean_code}:{now.timestamp()}"
        qr_hash = hashlib.sha256(raw_seed.encode("utf-8")).hexdigest()[:24]

        doc = {
            "organization_id": ObjectId(organization_id),
            "department_id": ObjectId(department_id),
            "name": name.strip(),
            "code": clean_code,
            "prefix": clean_prefix,
            "estimated_service_time": int(estimated_service_time),
            "max_daily_capacity": int(max_daily_capacity),
            "status": QueueStatus.ACTIVE,
            "operating_hours": operating_hours or {"start": "09:00", "end": "17:00"},
            "current_serving_token_id": None,
            "qr_code_hash": qr_hash,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_doc(doc)

    @classmethod
    def find_by_id(cls, db, queue_id):
        if not queue_id:
            return None
        try:
            oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def find_by_code(cls, db, code, organization_id=None):
        if not code:
            return None
        query = {"code": code.strip().upper()}
        if organization_id:
            query["organization_id"] = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        doc = cls.get_collection(db).find_one(query)
        return serialize_doc(doc)

    @classmethod
    def find_by_qr_hash(cls, db, qr_hash):
        if not qr_hash:
            return None
        doc = cls.get_collection(db).find_one({"qr_code_hash": qr_hash, "is_active": True})
        return serialize_doc(doc)

    @classmethod
    def list_by_organization(cls, db, organization_id, department_id=None, only_active=True):
        org_oid = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        query = {"organization_id": org_oid}
        if department_id:
            query["department_id"] = ObjectId(department_id) if isinstance(department_id, str) else department_id
        if only_active:
            query["is_active"] = True

        cursor = cls.get_collection(db).find(query).sort("name", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def update_status(cls, db, queue_id, status):
        if status not in QueueStatus.ALL:
            raise ValueError(f"Invalid queue status: {status}")

        oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
        )
        return cls.find_by_id(db, oid)

    @classmethod
    def update(cls, db, queue_id, update_data):
        oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id
        update_data["updated_at"] = datetime.now(timezone.utc)
        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_data})
        return cls.find_by_id(db, oid)
