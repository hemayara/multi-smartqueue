from flask import jsonify


def success_response(data=None, message="Operation successful", status_code=200):
    """Generate a uniform JSON success response."""
    payload = {
        "success": True,
        "message": message,
    }
    if data is not None:
        payload["data"] = data
    return jsonify(payload), status_code


def error_response(message="An error occurred", status_code=400, details=None, code=None):
    """Generate a uniform JSON error response."""
    payload = {
        "success": False,
        "error": message,
    }
    if details is not None:
        payload["details"] = details
    if code is not None:
        payload["code"] = code
    return jsonify(payload), status_code


def paginated_response(items, page, per_page, total, message="Items retrieved"):
    """Generate a uniform paginated JSON response."""
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    return jsonify({
        "success": True,
        "message": message,
        "data": items,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    }), 200
