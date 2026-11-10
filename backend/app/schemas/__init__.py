from marshmallow import ValidationError


def validate_schema(schema_instance, data):
    """Validate request dictionary against a marshmallow schema instance.
    
    Returns:
        tuple: (validated_data, None) on success, or (None, errors_dict) on validation failure.
    """
    try:
        validated = schema_instance.load(data)
        return validated, None
    except ValidationError as err:
        return None, err.messages
