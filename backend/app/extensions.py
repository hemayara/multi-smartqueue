import os
import logging
from pymongo import MongoClient
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
import firebase_admin
from firebase_admin import credentials

logger = logging.getLogger("smartqueue.extensions")

# Password hashing
bcrypt = Bcrypt()

# JWT Authentication manager
jwt = JWTManager()

# Socket.IO instance
socketio = SocketIO()


class MongoDB:
    """MongoDB wrapper supporting Flask application factory pattern with auto-fallback to mongomock."""

    def __init__(self, app=None):
        self.client = None
        self.db = None
        self.is_mock = False
        if app is not None:
            self.init_app(app)

    def init_app(self, app, custom_client=None):
        """Initialize MongoDB client from app config or a custom client (e.g. mongomock)."""
        if custom_client is not None:
            self.client = custom_client
            self.db = custom_client[app.config.get("MONGO_DB_NAME", "smart_queue_db")]
            self.is_mock = True
            logger.info("MongoDB initialized with custom/mock client.")
            return

        mongo_uri = app.config.get("MONGO_URI", "mongodb://localhost:27017/smart_queue_db")
        db_name = app.config.get("MONGO_DB_NAME", "smart_queue_db")

        try:
            # Check connection with a 2-second timeout
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            self.client = client
            self.db = self.client[db_name]
            self.is_mock = False
            logger.info(f"Connected to MongoDB at {mongo_uri} (database: {db_name})")
        except Exception as e:
            # If local instance is not running or unreachable, auto-fallback to mongomock
            is_local = "localhost" in mongo_uri or "127.0.0.1" in mongo_uri
            allow_mock = os.getenv("ALLOW_MOCK_DB", "true").lower() == "true"
            if is_local or allow_mock:
                try:
                    import mongomock
                    self.client = mongomock.MongoClient()
                    self.db = self.client[db_name]
                    self.is_mock = True
                    print("\n" + "=" * 65)
                    print("  [INFO] Local MongoDB (27017) not running.")
                    print("  [INFO] Seamlessly falling back to In-Memory Database (mongomock).")
                    print("  [INFO] All features, seed data, and tokens will run in memory!")
                    print("=" * 65 + "\n")
                    logger.warning(f"Connected to in-memory mongomock database '{db_name}'.")
                except ImportError:
                    logger.error(f"Failed to connect to MongoDB and mongomock is missing: {str(e)}")
                    raise e
            else:
                logger.error(f"Failed to connect to MongoDB at {mongo_uri}: {str(e)}")
                raise e

    def get_db(self):
        """Return the active database handle."""
        return self.db

    def close(self):
        """Close connection if active."""
        if self.client:
            self.client.close()


# Database singleton
mongo = MongoDB()


def init_firebase(app):
    """Safely initialize Firebase Admin SDK if service account credentials exist."""
    cred_path = app.config.get("FIREBASE_CREDENTIALS_PATH")
    project_id = app.config.get("FIREBASE_PROJECT_ID")

    if not firebase_admin._apps:
        try:
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
                logger.info("Firebase Admin SDK successfully initialized from certificate.")
                return True
            else:
                logger.info("Firebase credentials path not provided or not found. Push notifications will use mock/local mode.")
                return False
        except Exception as e:
            logger.warning(f"Could not initialize Firebase Admin SDK: {str(e)}")
            return False
    return True
