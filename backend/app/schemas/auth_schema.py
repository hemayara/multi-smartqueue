from marshmallow import Schema, fields, validate
from app.models.user import UserRole


class RegisterSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "Email is required."})
    password = fields.Str(
        required=True,
        validate=validate.Length(min=6, error="Password must be at least 6 characters."),
        error_messages={"required": "Password is required."}
    )
    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100, error="Full name must be between 2 and 100 characters."),
        error_messages={"required": "Full name is required."}
    )
    role = fields.Str(
        load_default=UserRole.STUDENT,
        validate=validate.OneOf(UserRole.ALL, error="Invalid user role.")
    )
    organization_id = fields.Str(load_default=None)
    department_id = fields.Str(load_default=None)
    assigned_counter_id = fields.Str(load_default=None)
    student_id = fields.Str(load_default=None, validate=validate.Length(max=50))
    phone_number = fields.Str(load_default=None, validate=validate.Length(max=20))


class LoginSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "Email is required."})
    password = fields.Str(required=True, error_messages={"required": "Password is required."})


class FCMTokenSchema(Schema):
    fcm_token = fields.Str(
        required=True,
        validate=validate.Length(min=10, error="Invalid FCM registration token."),
        error_messages={"required": "FCM token is required."}
    )
