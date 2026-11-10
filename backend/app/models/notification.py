from datetime import datetime, timezone
from bson import ObjectId
from pymongo import ASCENDING
from app.models import serialize_doc


class NotificationStatus:
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    ALL = [PENDING, SENT, FAILED]


class NotificationModel:
    COLLECTION_NAME = "notifications"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        collection = cls.get_collection(db)
        # Idempotency key must be unique to prevent duplicate notifications
        collection.create_index([("idempotency_key", ASCENDING)], unique=True, sparse=True)
        collection.create_index([("user_id", ASCENDING), ("created_at", -1)])
        collection.create_index([("token_id", ASCENDING)])
        collection.create_index([("status", ASCENDING)])

    @classmethod
    def create(cls, db, user_id, title, body, token_id=None, idempotency_key=None,
               channel="fcm", data=None):
        """Create a notification log record with idempotency protection."""
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": ObjectId(user_id) if user_id else None,
            "token_id": ObjectId(token_id) if token_id else None,
            "idempotency_key": idempotency_key,
            "title": title.strip(),
            "body": body.strip(),
            "channel": channel,
            "data": data or {},
            "status": NotificationStatus.PENDING,
            "error_message": None,
            "retry_count": 0,
            "created_at": now,
            "sent_at": None,
        }

        try:
            result = cls.get_collection(db).insert_one(doc)
            doc["_id"] = result.inserted_id
            return serialize_doc(doc)
        except Exception as e:
            # If duplicate key error on idempotency_key, find existing record
            if "duplicate key" in str(e).lower() and idempotency_key:
                existing = cls.get_collection(db).find_one({"idempotency_key": idempotency_key})
                return serialize_doc(existing)
            raise e

    @classmethod
    def mark_sent(cls, db, notification_id):
        oid = ObjectId(notification_id) if isinstance(notification_id, str) else notification_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {"$set": {"status": NotificationStatus.SENT, "sent_at": datetime.now(timezone.utc)}}
        )

    @classmethod
    def mark_failed(cls, db, notification_id, error_message):
        oid = ObjectId(notification_id) if isinstance(notification_id, str) else notification_id
        cls.get_collection(db).update_one(
            {"_id": oid},
            {
                "$set": {"status": NotificationStatus.FAILED, "error_message": str(error_message)},
                "$inc": {"retry_count": 1}
            }
        )

    @classmethod
    def list_user_notifications(cls, db, user_id, limit=20):
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        cursor = cls.get_collection(db).find({"user_id": user_oid}).sort("created_at", -1).limit(limit)
        return [serialize_doc(doc) for doc in cursor]
