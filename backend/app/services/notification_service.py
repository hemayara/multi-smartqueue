import logging

try:
    import firebase_admin
    from firebase_admin import messaging
except ImportError:
    firebase_admin = None
    messaging = None

from app.extensions import mongo
from app.models.user import UserModel
from app.models.notification import NotificationModel

logger = logging.getLogger("smartqueue.notifications")


class NotificationService:
    """Manages push notifications via FCM, local notification logs, and idempotency guarantees."""

    @classmethod
    def send_user_notification(cls, user_id, title, body, token_id=None,
                                idempotency_key=None, data_payload=None):
        """Send notification to a registered user across their active devices."""
        if not user_id:
            return None, "No recipient user provided."

        db = mongo.get_db()
        user = UserModel.find_by_id(db, user_id)
        if not user:
            return None, "Recipient user not found."

        # 1. Create notification log record (idempotency prevents duplicate pushes)
        try:
            notif_record = NotificationModel.create(
                db,
                user_id=user_id,
                title=title,
                body=body,
                token_id=token_id,
                idempotency_key=idempotency_key,
                channel="fcm",
                data=data_payload or {},
            )
        except Exception as e:
            logger.warning(f"Notification idempotency skip or error: {str(e)}")
            return None, f"Duplicate notification suppressed: {str(e)}"

        # 2. Check if Firebase is initialized and user has device tokens
        fcm_tokens = user.get("fcm_tokens", [])
        if not firebase_admin._apps or not fcm_tokens:
            # Mark sent as mock/local notification for dev/testing
            NotificationModel.mark_sent(db, notif_record["id"])
            logger.info(f"[LOCAL NOTIFICATION] To: {user['email']} | Title: '{title}' | Body: '{body}'")
            return notif_record, None

        # 3. Dispatch real FCM multicast message
        try:
            string_data = {k: str(v) for k, v in (data_payload or {}).items()}
            message = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data=string_data,
                tokens=fcm_tokens,
            )
            response = messaging.send_each_for_multicast(message)
            logger.info(f"FCM batch delivered: {response.success_count} success, {response.failure_count} failures")

            # Prune invalid registration tokens
            if response.failure_count > 0:
                for idx, resp in enumerate(response.responses):
                    if not resp.success:
                        bad_token = fcm_tokens[idx]
                        logger.info(f"Removing invalid FCM token: {bad_token}")
                        UserModel.remove_fcm_token(db, user_id, bad_token)

            NotificationModel.mark_sent(db, notif_record["id"])
            return notif_record, None
        except Exception as e:
            logger.error(f"FCM delivery error: {str(e)}")
            NotificationModel.mark_failed(db, notif_record["id"], str(e))
            return notif_record, str(e)

    @classmethod
    def send_sms_notification(cls, phone_number, message, token_id=None, user_id=None):
        """Send simulated SMS alert to registered mobile phone number."""
        import sys
        if not phone_number:
            return None, "No phone number provided."

        db = mongo.get_db()
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        safe_msg = message.encode(enc, errors="replace").decode(enc)

        try:
            print("\n" + "=" * 70)
            print(f"  [MOBILE SMS DISPATCHED] -> To: {phone_number}")
            print(f"  {message}")
            print("=" * 70 + "\n")
        except UnicodeEncodeError:
            print("\n" + "=" * 70)
            print(f"  [MOBILE SMS DISPATCHED] -> To: {phone_number}")
            print(f"  {safe_msg}")
            print("=" * 70 + "\n")

        try:
            logger.info(f"[MOBILE SMS] Sent to {phone_number}: {message}")
        except Exception:
            logger.info(f"[MOBILE SMS] Sent to {phone_number}: {safe_msg}")

        # Store in notification audit table with channel='sms'
        try:
            record = NotificationModel.create(
                db,
                user_id=user_id,
                title="SMS Turn Alert (5 Min Notice)",
                body=message,
                token_id=token_id,
                channel="sms",
                data={"phone": phone_number, "status": "delivered"}
            )
            NotificationModel.mark_sent(db, record["id"])
            return record, None
        except Exception as e:
            logger.warning(f"Failed to record SMS in DB: {e}")
            return None, str(e)

    @classmethod
    def notify_token_called(cls, token, counter_name):
        """Trigger notification when a student's token is called to a counter."""
        user_id = token.get("user_id")
        token_num = token.get("token_number")
        phone = token.get("guest_phone")

        if not phone and user_id:
            db = mongo.get_db()
            user = UserModel.find_by_id(db, user_id)
            if user:
                phone = user.get("phone_number")

        title = f"Your Turn! Token {token_num}"
        body = f"Please proceed immediately to {counter_name}."
        idempotency_key = f"token_called:{token['id']}"

        # Send push notification if user account exists
        if user_id:
            cls.send_user_notification(
                user_id=user_id,
                title=title,
                body=body,
                token_id=token["id"],
                idempotency_key=idempotency_key,
                data_payload={"type": "TOKEN_CALLED", "tokenId": token["id"], "counterName": counter_name}
            )

        # Send SMS alert to phone number
        if phone:
            sms_body = f"SmartQueue: Your token {token_num} is called now at {counter_name}! Please proceed immediately. (మీ టోకెన్ పిలవబడింది, దయచేసి {counter_name} వద్దకు రండి)."
            cls.send_sms_notification(phone, sms_body, token_id=token.get("id"), user_id=user_id)

    @classmethod
    def notify_turn_approaching(cls, token, position_ahead=1):
        """Trigger SMS and push alert 5 minutes before turn arrives (e.g. 1 ahead)."""
        db = mongo.get_db()
        user_id = token.get("user_id")
        token_num = token.get("token_number")
        phone = token.get("guest_phone")

        if not phone and user_id:
            user = UserModel.find_by_id(db, user_id)
            if user:
                phone = user.get("phone_number")

        if position_ahead == 2:
            title = f"Token {token_num} - Only 2 People Ahead!"
            body = (
                f"🔔 SmartQueue Alert: Token {token_num} - Only 2 members left ahead in line! "
                f"మీ టోకెన్ ఇప్పుడు వస్తుంది, come soon for your place! దయచేసి కౌంటర్ వద్దకు చేరుకోండి."
            )
        else:
            title = f"Token {token_num} - Next Turn is Yours!"
            body = (
                f"🔔 SmartQueue Alert: Token {token_num} is coming next! Next token is yours. "
                f"Please head to your counter immediately. (మీ టోకెన్ {token_num} తదుపరిది మీదే! దయచేసి కౌంటర్ వద్దకు వెళ్ళండి)."
            )
        idempotency_key = f"turn_approaching:{token['id']}:{position_ahead}"

        # 1. Send push notification
        if user_id:
            cls.send_user_notification(
                user_id=user_id,
                title=title,
                body=body,
                token_id=token["id"],
                idempotency_key=idempotency_key,
                data_payload={"type": "TURN_APPROACHING", "tokenId": token["id"], "positionAhead": position_ahead}
            )

        # 2. Send SMS to mobile phone
        if phone:
            cls.send_sms_notification(phone, body, token_id=token.get("id"), user_id=user_id)

        # 3. Broadcast real-time Socket.IO event for instant in-browser modal/alert
        try:
            from app.extensions import socketio
            socketio.emit(
                "token:approaching",
                {
                    "token_id": token.get("id"),
                    "token_number": token_num,
                    "phone": phone,
                    "message": body,
                    "position_ahead": position_ahead,
                },
                room=f"queue_{token.get('queue_id')}",
            )
        except Exception as e:
            logger.warning(f"Socket emit turn:approaching failed: {e}")
