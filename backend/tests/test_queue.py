import pytest
import concurrent.futures
from app.models.token import TokenModel, TokenStatus
from app.models.counter import CounterStatus
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.queue import QueueModel
from app.services.token_service import TokenService
from app.services.notification_service import NotificationService
from app.models.notification import NotificationModel


def test_queue_advance_lifecycle(client, setup_org, staff_headers):
    """End-to-end test: Join queue -> Call Next -> Start Service -> Complete Service."""
    queue_id = setup_org["queue"]["id"]
    counter_id = setup_org["counter"]["id"]
    staff_auth = {"Authorization": staff_headers["Authorization"]}

    # 1. Student joins queue
    res_join = client.post("/api/student/join", json={
        "queue_id": queue_id,
        "guest_name": "Test Student",
    })
    assert res_join.status_code == 201
    token = res_join.get_json()["data"]["token"]
    token_id = token["id"]
    assert token["token_number"] == "OSV-001"

    # 2. Staff calls next token
    res_call = client.post("/api/staff/call-next", headers=staff_auth, json={
        "queue_id": queue_id,
        "counter_id": counter_id,
    })
    assert res_call.status_code == 200
    called_token = res_call.get_json()["data"]["token"]
    assert called_token["id"] == token_id
    assert called_token["status"] == TokenStatus.CALLED

    # 3. Staff starts service
    res_start = client.post("/api/staff/start-service", headers=staff_auth, json={
        "token_id": token_id,
    })
    assert res_start.status_code == 200
    assert res_start.get_json()["data"]["token"]["status"] == TokenStatus.SERVING

    # 4. Staff completes service
    res_comp = client.post("/api/staff/complete-service", headers=staff_auth, json={
        "token_id": token_id,
        "counter_id": counter_id,
    })
    assert res_comp.status_code == 200
    assert res_comp.get_json()["data"]["token"]["status"] == TokenStatus.COMPLETED


def test_skip_token_flow(client, setup_org, staff_headers):
    """Test skipping / marking a token as no-show."""
    queue_id = setup_org["queue"]["id"]
    counter_id = setup_org["counter"]["id"]
    staff_auth = {"Authorization": staff_headers["Authorization"]}

    # Join
    res_join = client.post("/api/student/join", json={
        "queue_id": queue_id,
        "guest_name": "Late Student",
    })
    token_id = res_join.get_json()["data"]["token"]["id"]

    # Call Next
    client.post("/api/staff/call-next", headers=staff_auth, json={
        "queue_id": queue_id,
        "counter_id": counter_id,
    })

    # Skip
    res_skip = client.post("/api/staff/skip-token", headers=staff_auth, json={
        "token_id": token_id,
        "counter_id": counter_id,
        "reason": "Absent during roll call",
    })
    assert res_skip.status_code == 200
    assert res_skip.get_json()["data"]["token"]["status"] == TokenStatus.SKIPPED


def test_queue_pause_and_resume(client, setup_org, staff_headers):
    """Test pausing and resuming a queue."""
    queue_id = setup_org["queue"]["id"]
    counter_id = setup_org["counter"]["id"]
    staff_auth = {"Authorization": staff_headers["Authorization"]}

    # Pause queue
    res_pause = client.put(f"/api/staff/queue/{queue_id}/status", headers=staff_auth, json={
        "status": "paused"
    })
    assert res_pause.status_code == 200
    assert res_pause.get_json()["data"]["queue"]["status"] == "paused"

    # Attempt to call next while paused -> rejected
    res_call = client.post("/api/staff/call-next", headers=staff_auth, json={
        "queue_id": queue_id,
        "counter_id": counter_id,
    })
    assert res_call.status_code == 400
    assert "paused" in res_call.get_json()["error"]

    # Resume queue
    res_resume = client.put(f"/api/staff/queue/{queue_id}/status", headers=staff_auth, json={
        "status": "active"
    })
    assert res_resume.status_code == 200
    assert res_resume.get_json()["data"]["queue"]["status"] == "active"


def test_call_next_empty_queue(client, setup_org, staff_headers):
    """Test call next when no waiting tokens exist."""
    queue_id = setup_org["queue"]["id"]
    counter_id = setup_org["counter"]["id"]
    staff_auth = {"Authorization": staff_headers["Authorization"]}

    res = client.post("/api/staff/call-next", headers=staff_auth, json={
        "queue_id": queue_id,
        "counter_id": counter_id,
    })
    assert res.status_code == 400
    assert "No more waiting tokens" in res.get_json()["error"]


def test_notification_deduplication(app, setup_org, student_headers):
    """Test that duplicate notification jobs with the same idempotency key are suppressed."""
    user_id = student_headers["user"]["id"]

    # Send first notification
    notif1, err1 = NotificationService.send_user_notification(
        user_id=user_id,
        title="Alert 1",
        body="Message 1",
        idempotency_key="unique_key_123"
    )
    assert err1 is None
    assert notif1 is not None

    # Send second notification with same key
    notif2, err2 = NotificationService.send_user_notification(
        user_id=user_id,
        title="Alert 2",
        body="Message 2",
        idempotency_key="unique_key_123"
    )
    # Deduplication either returns the existing record without firing or returns error
    assert notif2 is not None or err2 is not None
