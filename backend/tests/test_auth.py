import pytest


def test_user_registration_success(client, setup_org):
    """Test successful student registration."""
    res = client.post("/api/auth/register", json={
        "email": "newstudent@apex.edu",
        "password": "securepassword123",
        "full_name": "New Student",
        "role": "student",
        "organization_id": setup_org["org"]["id"],
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["user"]["email"] == "newstudent@apex.edu"
    assert "access_token" in data["data"]["tokens"]


def test_duplicate_email_registration_rejected(client, setup_org):
    """Test that duplicate email registration returns 400 error."""
    payload = {
        "email": "duplicate@apex.edu",
        "password": "password123",
        "full_name": "Original User",
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.get_json()["error"]


def test_login_success_and_failure(client, setup_org):
    """Test login credentials verification."""
    client.post("/api/auth/register", json={
        "email": "loginuser@apex.edu",
        "password": "correctpassword",
        "full_name": "Login User",
    })

    # Wrong password
    res_bad = client.post("/api/auth/login", json={
        "email": "loginuser@apex.edu",
        "password": "wrongpassword",
    })
    assert res_bad.status_code == 401
    assert res_bad.get_json()["success"] is False

    # Correct password
    res_good = client.post("/api/auth/login", json={
        "email": "loginuser@apex.edu",
        "password": "correctpassword",
    })
    assert res_good.status_code == 200
    assert res_good.get_json()["success"] is True
    assert "access_token" in res_good.get_json()["data"]["tokens"]


def test_current_user_profile(client, student_headers):
    """Test retrieving profile using Bearer JWT token."""
    res = client.get("/api/auth/me", headers={"Authorization": student_headers["Authorization"]})
    assert res.status_code == 200
    assert res.get_json()["data"]["user"]["email"] == "student@apex.edu"


def test_role_permissions_enforcement(client, student_headers, staff_headers, admin_headers, setup_org):
    """Test that role middleware strictly blocks unauthorized users."""
    org_id = setup_org["org"]["id"]

    # 1. Student attempting to access Staff routes -> 403 Forbidden
    res1 = client.get("/api/staff/queues", headers={"Authorization": student_headers["Authorization"]})
    assert res1.status_code == 403
    assert res1.get_json()["code"] == "FORBIDDEN_ROLE"

    # 2. Student attempting to access Admin reports -> 403 Forbidden
    res2 = client.get(f"/api/admin/reports?organization_id={org_id}", headers={"Authorization": student_headers["Authorization"]})
    assert res2.status_code == 403

    # 3. Staff attempting to access Admin routes -> 403 Forbidden
    res3 = client.get(f"/api/admin/reports?organization_id={org_id}", headers={"Authorization": staff_headers["Authorization"]})
    assert res3.status_code == 403

    # 4. Admin accessing Admin routes -> 200 Success
    res4 = client.get(f"/api/admin/reports?organization_id={org_id}", headers={"Authorization": admin_headers["Authorization"]})
    assert res4.status_code == 200, res4.get_json()
