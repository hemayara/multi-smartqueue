from marshmallow import Schema, fields, validate, EXCLUDE
from app.models.queue import QueueStatus
from app.models.counter import CounterStatus


class JoinQueueSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    queue_id = fields.Str(required=True, error_messages={"required": "Queue ID is required."})
    guest_name = fields.Str(load_default=None, validate=validate.Length(max=100))
    guest_phone = fields.Str(load_default=None, validate=validate.Length(max=25))
    phone = fields.Str(load_default=None, validate=validate.Length(max=25))
    otp = fields.Str(load_default=None, validate=validate.Length(max=10))


class SendOTPSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    phone = fields.Str(required=True, validate=validate.Length(min=7, max=25), error_messages={"required": "Phone number is required."})


class VerifyOTPSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    phone = fields.Str(required=True, error_messages={"required": "Phone number is required."})
    otp = fields.Str(required=True, validate=validate.Length(min=4, max=10), error_messages={"required": "OTP code is required."})


class CancelTokenSchema(Schema):
    reason = fields.Str(load_default="Cancelled by user", validate=validate.Length(max=255))


class CallNextTokenSchema(Schema):
    counter_id = fields.Str(required=True, error_messages={"required": "Counter ID is required."})
    queue_id = fields.Str(required=True, error_messages={"required": "Queue ID is required."})


class UpdateQueueStatusSchema(Schema):
    status = fields.Str(
        required=True,
        validate=validate.OneOf(QueueStatus.ALL, error="Invalid queue status.")
    )


class UpdateCounterStatusSchema(Schema):
    status = fields.Str(
        required=True,
        validate=validate.OneOf(CounterStatus.ALL, error="Invalid counter status.")
    )
