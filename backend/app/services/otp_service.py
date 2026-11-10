import random
import time
import logging
from app.services.notification_service import NotificationService

logger = logging.getLogger("smartqueue.otp")

# In-memory storage for active OTPs: {phone_number: {"otp": str, "expires_at": float}}
_otp_store = {}


class OTPService:
    """Manages SMS OTP generation, dispatch, and verification for token issuance."""

    @classmethod
    def send_otp(cls, phone_number):
        """Generate and dispatch a 6-digit OTP to mobile number."""
        clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
        if not clean_phone:
            return None, "Phone number is required."

        # Generate 6-digit OTP
        otp = str(random.randint(100000, 999999))
        expires_at = time.time() + 300  # 5 minutes validity

        _otp_store[clean_phone] = {
            "otp": otp,
            "expires_at": expires_at,
        }

        # Dispatch simulated SMS alert
        msg = (
            f"SmartQueue OTP: Your verification code is {otp}. "
            f"Valid for 5 minutes. (మీ స్మార్ట్ క్యూ వెరిఫికేషన్ కోడ్: {otp})."
        )
        NotificationService.send_sms_notification(clean_phone, msg)

        logger.info(f"[OTP DISPATCHED] Phone: {clean_phone} -> OTP: {otp}")

        return {
            "phone": clean_phone,
            "message": "OTP sent successfully to your mobile number.",
            "otp": otp,  # Included for demo convenience / testing
            "expires_in_seconds": 300,
        }, None

    @classmethod
    def verify_otp(cls, phone_number, provided_otp):
        """Verify the user-entered OTP."""
        clean_phone = phone_number.strip().replace(" ", "").replace("-", "")
        provided_otp = str(provided_otp).strip()

        # Universal fallback for fast testing/demo
        if provided_otp == "123456":
            return True, None

        record = _otp_store.get(clean_phone)
        if not record:
            return False, "No OTP requested for this phone number. Please click Send OTP."

        if time.time() > record["expires_at"]:
            _otp_store.pop(clean_phone, None)
            return False, "OTP has expired. Please request a new OTP."

        if record["otp"] != provided_otp:
            return False, "Invalid OTP code. Please enter the correct code."

        # Verified! Remove used OTP
        _otp_store.pop(clean_phone, None)
        return True, None
