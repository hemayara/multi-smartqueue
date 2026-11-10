"""Token Model and Atomic Sequence Allocation

TRANSACTION & DEPLOYMENT NOTE:
Atomic token generation uses MongoDB's atomic find_one_and_update with $inc on the
'token_sequences' collection. This guarantees strictly monotonic, non-colliding
sequences without requiring multi-document ACID transactions.

For multi-document coordination (e.g., simultaneously marking a token completed,
setting counter to open, and advancing queue current_serving_token_id), MongoDB
multi-document transactions require a replica set (standalone mongod without --replSet
does not support start_session() / with_transaction). The service layer implements
defensive idempotency and error rollbacks to operate reliably on both standalone
and replica-set / MongoDB Atlas clusters.
"""

from datetime import datetime, timezone, date
from bson import ObjectId
from pymongo import ASCENDING, ReturnDocument
from app.models import serialize_doc


class TokenStatus:
    WAITING = "waiting"
    CALLED = "called"
    SERVING = "serving"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"

    ACTIVE_STATUSES = [WAITING, CALLED, SERVING]
    TERMINAL_STATUSES = [COMPLETED, CANCELLED, SKIPPED]
    ALL = [WAITING, CALLED, SERVING, COMPLETED, CANCELLED, SKIPPED]


class TokenModel:
    COLLECTION_NAME = "tokens"
    SEQUENCE_COLLECTION_NAME = "token_sequences"

    @classmethod
    def get_collection(cls, db):
        return db[cls.COLLECTION_NAME]

    @classmethod
    def get_sequence_collection(cls, db):
        return db[cls.SEQUENCE_COLLECTION_NAME]

    @classmethod
    def ensure_indexes(cls, db):
        """Establish indexes for token uniqueness, fast lookups, and real-time queue ordering."""
        tokens = cls.get_collection(db)
        sequences = cls.get_sequence_collection(db)

        # 1. Sequence unique constraint
        sequences.create_index(
            [("organization_id", ASCENDING), ("queue_id", ASCENDING), ("service_date", ASCENDING)],
            unique=True,
        )

        # 2. Token unique constraint per organization, queue, and day
        tokens.create_index(
            [
                ("organization_id", ASCENDING),
                ("queue_id", ASCENDING),
                ("service_date", ASCENDING),
                ("sequence_number", ASCENDING),
            ],
            unique=True,
        )
        tokens.create_index(
            [
                ("organization_id", ASCENDING),
                ("queue_id", ASCENDING),
                ("service_date", ASCENDING),
                ("token_number", ASCENDING),
            ],
            unique=True,
        )

        # 3. Fast operational query indexes
        tokens.create_index([("queue_id", ASCENDING), ("status", ASCENDING), ("created_at", ASCENDING)])
        tokens.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
        tokens.create_index([("counter_id", ASCENDING), ("status", ASCENDING)])
        tokens.create_index([("service_date", ASCENDING)])

    @classmethod
    def get_next_sequence_number(cls, db, organization_id, queue_id, service_date):
        """Atomically increment and return the next sequence number for a queue on a service date.
        
        Guaranteed non-colliding via MongoDB find_one_and_update $inc with upsert.
        """
        org_oid = ObjectId(organization_id) if isinstance(organization_id, str) else organization_id
        queue_oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id

        seq_doc = cls.get_sequence_collection(db).find_one_and_update(
            {"organization_id": org_oid, "queue_id": queue_oid, "service_date": service_date},
            {"$inc": {"last_seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return seq_doc["last_seq"]

    @classmethod
    def check_user_active_token(cls, db, user_id, queue_id=None):
        """Check if a user already has an active token in the given queue or globally."""
        if not user_id:
            return None
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        query = {
            "user_id": user_oid,
            "status": {"$in": TokenStatus.ACTIVE_STATUSES},
        }
        if queue_id:
            query["queue_id"] = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id

        doc = cls.get_collection(db).find_one(query)
        return serialize_doc(doc)

    @classmethod
    def create(cls, db, organization_id, department_id, queue_id, prefix,
               user_id=None, guest_name=None, guest_phone=None):
        """Create a new token with atomic sequence allocation."""
        now = datetime.now(timezone.utc)
        service_date = now.strftime("%Y-%m-%d")

        # 1. Allocate next sequence atomically
        seq_num = cls.get_next_sequence_number(db, organization_id, queue_id, service_date)
        formatted_token_number = f"{prefix.strip().upper()}-{seq_num:03d}"

        token_doc = {
            "token_number": formatted_token_number,
            "sequence_number": seq_num,
            "service_date": service_date,
            "organization_id": ObjectId(organization_id),
            "department_id": ObjectId(department_id),
            "queue_id": ObjectId(queue_id),
            "user_id": ObjectId(user_id) if user_id else None,
            "guest_name": guest_name.strip() if guest_name else None,
            "guest_phone": guest_phone.strip() if guest_phone else None,
            "counter_id": None,
            "served_by_staff_id": None,
            "status": TokenStatus.WAITING,
            "called_at": None,
            "serving_started_at": None,
            "completed_at": None,
            "cancelled_at": None,
            "cancellation_reason": None,
            "notes": None,
            "created_at": now,
            "updated_at": now,
        }

        result = cls.get_collection(db).insert_one(token_doc)
        token_doc["_id"] = result.inserted_id
        return serialize_doc(token_doc)

    @classmethod
    def find_by_id(cls, db, token_id):
        if not token_id:
            return None
        try:
            oid = ObjectId(token_id) if isinstance(token_id, str) else token_id
            doc = cls.get_collection(db).find_one({"_id": oid})
            return serialize_doc(doc)
        except Exception:
            return None

    @classmethod
    def get_waiting_tokens(cls, db, queue_id, service_date=None):
        """Get all waiting tokens for a queue ordered by sequence/time."""
        queue_oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id
        query = {
            "queue_id": queue_oid,
            "status": TokenStatus.WAITING,
        }
        if service_date:
            query["service_date"] = service_date
        cursor = cls.get_collection(db).find(query).sort("sequence_number", ASCENDING)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def count_ahead_in_queue(cls, db, queue_id, sequence_number, service_date):
        """Count how many eligible waiting tokens are ahead of a given sequence number."""
        queue_oid = ObjectId(queue_id) if isinstance(queue_id, str) else queue_id
        return cls.get_collection(db).count_documents({
            "queue_id": queue_oid,
            "service_date": service_date,
            "status": TokenStatus.WAITING,
            "sequence_number": {"$lt": sequence_number},
        })

    @classmethod
    def list_user_tokens(cls, db, user_id, limit=20):
        """List active and historical tokens for a student user."""
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id
        cursor = cls.get_collection(db).find({"user_id": user_oid}).sort("created_at", -1).limit(limit)
        return [serialize_doc(doc) for doc in cursor]

    @classmethod
    def update_status(cls, db, token_id, new_status, counter_id=None, staff_id=None, **kwargs):
        """Update token lifecycle status with timestamp recording."""
        if new_status not in TokenStatus.ALL:
            raise ValueError(f"Invalid token status: {new_status}")

        oid = ObjectId(token_id) if isinstance(token_id, str) else token_id
        now = datetime.now(timezone.utc)
        update_fields = {
            "status": new_status,
            "updated_at": now,
        }

        if counter_id:
            update_fields["counter_id"] = ObjectId(counter_id) if isinstance(counter_id, str) else counter_id
        if staff_id:
            update_fields["served_by_staff_id"] = ObjectId(staff_id) if isinstance(staff_id, str) else staff_id

        if new_status == TokenStatus.CALLED:
            update_fields["called_at"] = now
        elif new_status == TokenStatus.SERVING:
            update_fields["serving_started_at"] = now
        elif new_status == TokenStatus.COMPLETED:
            update_fields["completed_at"] = now
        elif new_status == TokenStatus.CANCELLED:
            update_fields["cancelled_at"] = now
            if "reason" in kwargs:
                update_fields["cancellation_reason"] = kwargs["reason"]

        for k, v in kwargs.items():
            if k not in ("reason",):
                update_fields[k] = v

        cls.get_collection(db).update_one({"_id": oid}, {"$set": update_fields})
        return cls.find_by_id(db, oid)
