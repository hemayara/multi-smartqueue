import pytest
import concurrent.futures
from app.models.token import TokenStatus
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.queue import QueueModel
from app.services.token_service import TokenService


def test_atomic_token_allocation(client, setup_org, student_headers):
    """Test sequential token number generation and uniqueness."""
    queue_id = setup_org["queue"]["id"]

    # Student 1 joins
    res1 = client.post(
        "/api/student/join",
        headers={"Authorization": student_headers["Authorization"]},
        json={"queue_id": queue_id}
    )
    assert res1.status_code == 201
    t1 = res1.get_json()["data"]["token"]
    assert t1["token_number"] == "OSV-001"
    assert t1["status"] == "waiting"
    assert t1["estimation"]["position_ahead"] == 0

    # Guest joins same queue
    res2 = client.post("/api/student/join", json={
        "queue_id": queue_id,
        "guest_name": "Guest Visitor",
    })
    assert res2.status_code == 201, res2.get_json()
    t2 = res2.get_json()["data"]["token"]
    assert t2["token_number"] == "OSV-002"
    assert t2["estimation"]["position_ahead"] == 1


def test_duplicate_active_token_prevention(client, setup_org, student_headers):
    """Test that a student cannot join twice when concurrent tokens are disallowed."""
    queue_id = setup_org["queue"]["id"]
    headers = {"Authorization": student_headers["Authorization"]}

    # Join first time -> success
    res1 = client.post("/api/student/join", headers=headers, json={"queue_id": queue_id})
    assert res1.status_code == 201

    # Attempt to join second time -> rejected
    res2 = client.post("/api/student/join", headers=headers, json={"queue_id": queue_id})
    assert res2.status_code == 400
    assert "already have an active token" in res2.get_json()["error"]


def test_token_cancellation(client, setup_org, student_headers):
    """Test cancelling an active waiting token."""
    queue_id = setup_org["queue"]["id"]
    headers = {"Authorization": student_headers["Authorization"]}

    # Join
    res = client.post("/api/student/join", headers=headers, json={"queue_id": queue_id})
    token_id = res.get_json()["data"]["token"]["id"]

    # Cancel
    cancel_res = client.post(
        f"/api/student/token/{token_id}/cancel",
        headers=headers,
        json={"reason": "Need to leave campus"}
    )
    assert cancel_res.status_code == 200
    updated = cancel_res.get_json()["data"]["token"]
    assert updated["status"] == TokenStatus.CANCELLED
    assert updated["cancellation_reason"] == "Need to leave campus"


def test_token_wait_time_estimation(client, setup_org):
    """Test wait time calculation increases proportionally with people ahead."""
    queue_id = setup_org["queue"]["id"]

    # Issue 3 guest tokens
    tokens = []
    for i in range(3):
        res = client.post("/api/student/join", json={
            "queue_id": queue_id,
            "guest_name": f"Student {i+1}",
        })
        tokens.append(res.get_json()["data"]["token"])

    # 1st has 0 ahead
    assert tokens[0]["estimation"]["position_ahead"] == 0
    # 2nd has 1 ahead
    assert tokens[1]["estimation"]["position_ahead"] == 1
    # 3rd has 2 ahead
    assert tokens[2]["estimation"]["position_ahead"] == 2
    assert tokens[2]["estimation"]["estimated_wait_minutes"] > tokens[0]["estimation"]["estimated_wait_minutes"]


def test_concurrent_token_allocation(app, setup_org):
    """Test that concurrent token generation across threads produces strictly unique sequences."""
    queue_id = setup_org["queue"]["id"]

    def issue_token(idx):
        with app.app_context():
            token, err = TokenService.join_queue(queue_id, guest_name=f"Concurrent_{idx}")
            return token["token_number"]

    # Issue 10 tokens concurrently across thread pool
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(issue_token, i) for i in range(10)]
        token_numbers = [f.result() for f in concurrent.futures.as_completed(futures)]

    # All 10 token numbers must be strictly unique!
    assert len(token_numbers) == 10
    assert len(set(token_numbers)) == 10
    assert all(t.startswith("OSV-") for t in token_numbers)
