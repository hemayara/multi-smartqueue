import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration with default settings and environment variables."""

    # Core Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "smartqueue-dev-secret-key-321")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = False
    TESTING = False

    # MongoDB Settings
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/smart_queue_db")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smart_queue_db")

    # JWT Settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smartqueue-jwt-secret-key-654")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 1440))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 30))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # CORS & Frontend Origins
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000",
        ).split(",")
        if origin.strip()
    ]

    # Socket.IO Settings
    SOCKETIO_ASYNC_MODE = os.getenv("SOCKETIO_ASYNC_MODE", "threading")
    SOCKETIO_CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "SOCKETIO_CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

    # Firebase Admin SDK Configuration
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")

    # Queue System Defaults
    DEFAULT_TOKEN_PREFIX = os.getenv("DEFAULT_TOKEN_PREFIX", "TKN")
    DEFAULT_ESTIMATED_SERVICE_TIME_MINUTES = int(
        os.getenv("DEFAULT_ESTIMATED_SERVICE_TIME_MINUTES", 5)
    )


class DevelopmentConfig(Config):
    """Configuration for local development."""

    DEBUG = True
    FLASK_ENV = "development"


class TestingConfig(Config):
    """Configuration for automated test execution."""

    TESTING = True
    DEBUG = False
    FLASK_ENV = "testing"
    MONGO_URI = os.getenv("TEST_MONGO_URI", "mongodb://localhost:27017/smart_queue_test_db")
    MONGO_DB_NAME = "smart_queue_test_db"
    JWT_SECRET_KEY = "test-jwt-secret-key-super-secure-32bytes-min"
    SECRET_KEY = "test-flask-secret-key-32bytes-long-secure"
    # Shorter expiry for fast testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)


class ProductionConfig(Config):
    """Configuration for production deployment."""

    DEBUG = False
    TESTING = False

    @classmethod
    def validate_production(cls):
        """Ensure critical secrets are explicitly provided in production."""
        secret = os.getenv("SECRET_KEY")
        jwt_secret = os.getenv("JWT_SECRET_KEY")
        mongo_uri = os.getenv("MONGO_URI")

        if not secret or "dev" in secret or "change-this" in secret:
            raise ValueError("Insecure or missing SECRET_KEY in production environment!")
        if not jwt_secret or "secret" in jwt_secret or "change-this" in jwt_secret:
            raise ValueError("Insecure or missing JWT_SECRET_KEY in production environment!")
        if not mongo_uri:
            raise ValueError("Missing MONGO_URI in production environment!")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
