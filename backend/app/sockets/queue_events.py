import logging
from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from app.extensions import socketio

logger = logging.getLogger("smartqueue.sockets")


def broadcast_queue_event(queue_id, event_name, payload):
    """Broadcast real-time event to all clients subscribed to a specific queue room.
    
    Sanitizes personal identifying information before dispatching.
    """
    if not queue_id:
        return

    room_name = f"queue_{queue_id}"
    sanitized_payload = _sanitize_socket_payload(payload)

    try:
        socketio.emit(event_name, sanitized_payload, room=room_name)
        logger.debug(f"Socket.IO broadcast [{event_name}] to room [{room_name}]")
    except Exception as e:
        logger.warning(f"Error broadcasting socket event {event_name}: {str(e)}")


def broadcast_user_event(user_id, event_name, payload):
    """Broadcast private event to an authenticated user's private channel."""
    if not user_id:
        return

    room_name = f"user_{user_id}"
    try:
        socketio.emit(event_name, payload, room=room_name)
    except Exception as e:
        logger.warning(f"Error broadcasting user socket event: {str(e)}")


def _sanitize_socket_payload(payload):
    """Strip passwords and internal hashes from socket payloads."""
    if not isinstance(payload, dict):
        return payload

    sanitized = dict(payload)
    sensitive_keys = ["password_hash", "fcm_tokens", "guest_phone"]
    for key in sensitive_keys:
        sanitized.pop(key, None)
    return sanitized


def register_queue_socket_handlers(sio):
    """Bind Socket.IO events for connection, room subscriptions, and reconnection sync."""

    @sio.on("connect")
    def handle_connect(auth=None):
        """Handle incoming Socket.IO connection and optional JWT authentication."""
        auth_data = auth or {}
        token = auth_data.get("token") or request.args.get("token")
        user_info = None

        if token:
            try:
                decoded = decode_token(token)
                user_info = decoded.get("sub")
                logger.info(f"Socket client connected (Authenticated: user_id={user_info})")
            except Exception as e:
                logger.warning(f"Socket connection provided invalid token: {str(e)}")

        emit("connected", {"status": "connected", "authenticated": user_info is not None})

    @sio.on("disconnect")
    def handle_disconnect():
        logger.info(f"Socket client disconnected: {request.sid}")

    @sio.on("join_queue_room")
    def handle_join_queue(data):
        """Subscribe client to updates for a specific queue."""
        queue_id = (data or {}).get("queue_id")
        if not queue_id:
            return emit("error", {"message": "queue_id is required to join queue room"})

        room_name = f"queue_{queue_id}"
        join_room(room_name)
        logger.info(f"Client {request.sid} joined room {room_name}")
        emit("joined_queue_room", {"queue_id": queue_id, "room": room_name})

    @sio.on("leave_queue_room")
    def handle_leave_queue(data):
        """Unsubscribe client from a queue room."""
        queue_id = (data or {}).get("queue_id")
        if queue_id:
            room_name = f"queue_{queue_id}"
            leave_room(room_name)
            emit("left_queue_room", {"queue_id": queue_id})

    @sio.on("join_user_room")
    def handle_join_user_room(data):
        """Subscribe user to their personal notification channel."""
        user_id = (data or {}).get("user_id")
        if user_id:
            room_name = f"user_{user_id}"
            join_room(room_name)
            emit("joined_user_room", {"user_id": user_id})

    @sio.on("request_queue_state")
    def handle_request_queue_state(data):
        """Reconnection recovery: client requests authoritative live queue state."""
        queue_id = (data or {}).get("queue_id")
        if not queue_id:
            return emit("error", {"message": "queue_id is required"})

        from app.services.queue_service import QueueService
        state = QueueService.get_queue_status(queue_id)
        if state:
            emit("queue_state_sync", state)
        else:
            emit("error", {"message": "Queue not found"})
