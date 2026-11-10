from datetime import datetime
from bson import ObjectId


def serialize_doc(doc):
    """Recursively convert MongoDB document BSON types (ObjectId, datetime) to JSON-serializable types."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                result["id"] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc


def init_indexes(db):
    """Create all required indexes across all collections."""
    from app.models.user import UserModel
    from app.models.organization import OrganizationModel
    from app.models.department import DepartmentModel
    from app.models.counter import CounterModel
    from app.models.queue import QueueModel
    from app.models.token import TokenModel
    from app.models.notification import NotificationModel

    UserModel.ensure_indexes(db)
    OrganizationModel.ensure_indexes(db)
    DepartmentModel.ensure_indexes(db)
    CounterModel.ensure_indexes(db)
    QueueModel.ensure_indexes(db)
    TokenModel.ensure_indexes(db)
    NotificationModel.ensure_indexes(db)
