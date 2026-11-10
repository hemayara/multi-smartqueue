import os
from app import create_app
from app.extensions import socketio, mongo
from app.models import init_indexes

# Create Flask application from environment
env_name = os.getenv("FLASK_ENV", "development")
app = create_app(env_name)

# Ensure database indexes exist and optionally seed demo data
with app.app_context():
    try:
        db = mongo.get_db()
        if db is not None:
            init_indexes(db)
            # Auto-seed demo data on first deploy if flag is set
            if os.getenv("AUTO_SEED_DEMO", "false").lower() == "true":
                from run import seed_demo_data
                seed_demo_data(app)
    except Exception as e:
        app.logger.warning(f"Could not automatically initialize on startup: {str(e)}")

# Expose WSGI objects
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = env_name == "development"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug, allow_unsafe_werkzeug=True)
