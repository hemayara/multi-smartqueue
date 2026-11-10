import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import config_by_name
from app.extensions import bcrypt, jwt, socketio, mongo, init_firebase

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(name)s: %(message)s",
)
logger = logging.getLogger("smartqueue.app")


def create_app(config_name=None, custom_mongo_client=None):
    """Application factory for the Smart Queue Flask application."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    config_class = config_by_name.get(config_name, config_by_name["development"])

    app = Flask(__name__)
    app.config.from_object(config_class)

    # 1. Initialize CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # 2. Initialize Extensions
    bcrypt.init_app(app)
    jwt.init_app(app)
    mongo.init_app(app, custom_client=custom_mongo_client)
    init_firebase(app)

    # Initialize Socket.IO with Flask app
    socketio.init_app(
        app,
        cors_allowed_origins=app.config.get("SOCKETIO_CORS_ALLOWED_ORIGINS", "*"),
        async_mode=app.config.get("SOCKETIO_ASYNC_MODE", "threading"),
        manage_session=False,
    )

    # 3. JWT Error Handlers
    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        return jsonify({
            "success": False,
            "error": "Authorization token is missing",
            "code": "MISSING_TOKEN"
        }), 401

    @jwt.invalid_token_loader
    def custom_invalid_token_response(callback):
        return jsonify({
            "success": False,
            "error": "The provided authorization token is invalid",
            "code": "INVALID_TOKEN"
        }), 401

    @jwt.expired_token_loader
    def custom_expired_token_response(jwt_header, jwt_payload):
        return jsonify({
            "success": False,
            "error": "Authorization token has expired. Please log in again.",
            "code": "EXPIRED_TOKEN"
        }), 401

    # 4. Standard HTTP Error Handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"success": False, "error": "Bad request", "details": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Requested resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"success": False, "error": "HTTP method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal Server Error: {str(error)}")
        return jsonify({"success": False, "error": "Internal server error occurred"}), 500

    # 5. Core Health Check Endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check endpoint validating API and database accessibility."""
        db_status = "connected"
        try:
            # Ping database if real client is configured
            if mongo.client:
                mongo.client.admin.command("ping")
        except Exception as e:
            db_status = f"unreachable: {str(e)}"

        return jsonify({
            "success": True,
            "status": "healthy" if "unreachable" not in db_status else "degraded",
            "environment": app.config.get("FLASK_ENV"),
            "database": db_status,
            "socketio_async_mode": app.config.get("SOCKETIO_ASYNC_MODE")
        }), 200

    # 6. Blueprints registration (will register blueprints as routes are built)
    _register_blueprints(app)

    # 7. Register socket event handlers
    _register_socket_events()

    logger.info(f"SmartQueue app created successfully with environment: {config_name}")
    return app


def _register_blueprints(app):
    """Safely register route blueprints if modules are present."""
    try:
        from app.routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/auth")
    except ImportError:
        pass

    try:
        from app.routes.student import student_bp
        app.register_blueprint(student_bp, url_prefix="/api/student")
    except ImportError:
        pass

    try:
        from app.routes.staff import staff_bp
        app.register_blueprint(staff_bp, url_prefix="/api/staff")
    except ImportError:
        pass

    try:
        from app.routes.admin import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/admin")
    except ImportError:
        pass

    try:
        from app.routes.queue import queue_bp
        app.register_blueprint(queue_bp, url_prefix="/api/queue")
    except ImportError:
        pass


def _register_socket_events():
    """Safely register Socket.IO events if socket module is present."""
    try:
        from app.sockets.queue_events import register_queue_socket_handlers
        register_queue_socket_handlers(socketio)
    except ImportError:
        pass
