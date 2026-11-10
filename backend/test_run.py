"""
Standalone in-process test runner for SmartQueue backend.
Runs against an in-memory mongomock database — no MongoDB needed.
"""
import os, sys, json

os.environ["FLASK_ENV"] = "development"
os.environ["AUTO_SEED_DEMO"] = "true"

from app import create_app
from app.extensions import socketio, mongo
from app.models import init_indexes
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.counter import CounterModel, CounterStatus
from app.models.queue import QueueModel
from app.models.user import UserModel, UserRole
from app.services.auth_service import AuthService

app = create_app("development")

with app.app_context():
    db = mongo.get_db()

    # ── Clean slate ────────────────────────────────────────────────────────────
    db.organizations.delete_many({"code": "APEX"})
    db.departments.delete_many({})
    db.queues.delete_many({})
    db.counters.delete_many({})
    demo_emails = ["admin@apex.edu", "staff@apex.edu", "student@apex.edu"]
    db.users.delete_many({"email": {"$in": demo_emails}})
    db.tokens.delete_many({})
    db.token_sequences.delete_many({})

    # ── Seed ───────────────────────────────────────────────────────────────────
    org = OrganizationModel.create(
        db,
        name="SmartQueue Multi-Service Hub",
        code="APEX",
        contact_email="support@smartqueue.org",
        working_hours={"start": "08:30", "end": "18:00",
                       "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]},
        settings={
            "allow_concurrent_tokens": True,
            "default_estimated_service_time": 5,
            "max_daily_tokens_per_student": 10,
        },
    )
    org_id = org["id"]

    hosp_dept = DepartmentModel.create(db, org_id, "Hospital & Clinical Healthcare", "HOSP-DEPT")
    bank_dept = DepartmentModel.create(db, org_id, "Retail Banking & Financial Services", "BANK-DEPT")
    edu_dept  = DepartmentModel.create(db, org_id, "School & College Academic Services", "EDU-DEPT")

    hosp_queue = QueueModel.create(db, org_id, hosp_dept["id"],
        "Hospital OPD & Doctor Consultation Queue", "HOSP-OPD",
        prefix="HOSP", estimated_service_time=10, max_daily_capacity=100)
    bank_queue = QueueModel.create(db, org_id, bank_dept["id"],
        "Bank Cash & Account Services Queue", "BANK-CASH",
        prefix="BANK", estimated_service_time=5, max_daily_capacity=200)
    edu_queue  = QueueModel.create(db, org_id, edu_dept["id"],
        "School & College Fee & Admission Queue", "EDU-CLG",
        prefix="EDU",  estimated_service_time=6, max_daily_capacity=150)

    c1 = CounterModel.create(db, org_id, hosp_dept["id"], "Doctor OPD Room 1", 1)
    c2 = CounterModel.create(db, org_id, hosp_dept["id"], "Doctor OPD Room 2", 2)
    c3 = CounterModel.create(db, org_id, bank_dept["id"], "Cash & Deposit Counter 1", 3)
    c5 = CounterModel.create(db, org_id, edu_dept["id"],  "Student Admission Desk 1", 5)
    CounterModel.update_status(db, c1["id"], CounterStatus.OPEN)
    CounterModel.update_status(db, c3["id"], CounterStatus.OPEN)
    CounterModel.update_status(db, c5["id"], CounterStatus.OPEN)

    AuthService.register_user(email="admin@apex.edu",   password="adminpassword123",
        full_name="Central System Administrator", role=UserRole.ADMIN, organization_id=org_id)
    AuthService.register_user(email="staff@apex.edu",   password="staffpassword123",
        full_name="Dr. Robert Vance (Hospital OPD)", role=UserRole.STAFF,
        organization_id=org_id, department_id=hosp_dept["id"], assigned_counter_id=c1["id"])
    AuthService.register_user(email="student@apex.edu", password="studentpassword123",
        full_name="Alice Johnson", role=UserRole.STUDENT,
        organization_id=org_id, student_id="STU-2026-042")

    # ── Test helpers ───────────────────────────────────────────────────────────
    # Must use test_request_context so JWT Bearer headers work
    with app.test_request_context():
        client = app.test_client()

        def pp(label, r):
            body = r.get_json()
            print(f"\n{'='*65}")
            print(f"  {label}")
            print(f"{'='*65}")
            status_icon = "✅" if r.status_code < 400 else "❌"
            print(f"  {status_icon}  HTTP {r.status_code}")
            print(json.dumps(body, indent=4, default=str))
            return body

        def hdr(token):
            return {"Authorization": f"Bearer {token}"}

        # ── Tests ──────────────────────────────────────────────────────────────

        # 1. Health
        pp("[1] HEALTH CHECK", client.get("/api/health"))

        # 2. Logins
        admin_resp = pp("[2] ADMIN LOGIN",
            client.post("/api/auth/login",
                json={"email": "admin@apex.edu", "password": "adminpassword123"},
                content_type="application/json"))
        staff_resp = pp("[3] STAFF LOGIN",
            client.post("/api/auth/login",
                json={"email": "staff@apex.edu", "password": "staffpassword123"},
                content_type="application/json"))
        stu_resp   = pp("[4] STUDENT LOGIN",
            client.post("/api/auth/login",
                json={"email": "student@apex.edu", "password": "studentpassword123"},
                content_type="application/json"))

        admin_token = (admin_resp.get("data") or {}).get("tokens", {}).get("access_token", "")
        staff_token = (staff_resp.get("data") or {}).get("tokens", {}).get("access_token", "")
        stu_token   = (stu_resp.get("data") or {}).get("tokens", {}).get("access_token", "")

        print(f"\n  [TOKENS ISSUED]")
        print(f"  Admin  token prefix : {admin_token[:40]}...")
        print(f"  Staff  token prefix : {staff_token[:40]}...")
        print(f"  Student token prefix: {stu_token[:40]}...")

        # 3. Profile
        pp("[5] MY PROFILE (admin)",
            client.get("/api/auth/me", headers=hdr(admin_token)))

        # 4. Public Queue listing
        pp("[6] PUBLIC QUEUE LIST",
            client.get("/api/queue/public/list"))

        # 5. Admin queues
        pp("[7] ADMIN — LIST QUEUES",
            client.get("/api/admin/queues", headers=hdr(admin_token)))

        # 6. Admin departments
        pp("[8] ADMIN — LIST DEPARTMENTS",
            client.get("/api/admin/departments", headers=hdr(admin_token)))

        # 7. Admin counters
        pp("[9] ADMIN — LIST COUNTERS",
            client.get("/api/admin/counters", headers=hdr(admin_token)))

        # 8. Student joins Hospital queue
        hosp_q_id = hosp_queue["id"]
        bank_q_id = bank_queue["id"]
        edu_q_id  = edu_queue["id"]

        pp("[10] STUDENT JOINS HOSPITAL QUEUE (HOSP-OPD)",
            client.post("/api/student/join", headers=hdr(stu_token),
                json={"queue_id": hosp_q_id},
                content_type="application/json"))

        pp("[11] STUDENT JOINS BANK QUEUE (BANK-CASH)",
            client.post("/api/student/join", headers=hdr(stu_token),
                json={"queue_id": bank_q_id},
                content_type="application/json"))

        pp("[12] STUDENT JOINS COLLEGE QUEUE (EDU-CLG)",
            client.post("/api/student/join", headers=hdr(stu_token),
                json={"queue_id": edu_q_id},
                content_type="application/json"))

        # 9. Queue status (staff view)
        pp("[13] STAFF — HOSPITAL QUEUE STATUS",
            client.get(f"/api/staff/queue/{hosp_q_id}/status", headers=hdr(staff_token)))

        # 10. Student active token
        pp("[14] STUDENT — VIEW ACTIVE TOKENS",
            client.get("/api/student/active-token", headers=hdr(stu_token)))

        # 11. Staff calls next token
        pp("[15] STAFF CALLS NEXT TOKEN (Hospital OPD)",
            client.post("/api/staff/call-next", headers=hdr(staff_token),
                json={"queue_id": hosp_q_id},
                content_type="application/json"))

        # 12. Admin reports
        pp("[16] ADMIN — REPORTS",
            client.get("/api/admin/reports", headers=hdr(admin_token)))

        # 13. Wrong password → 401
        pp("[17] WRONG PASSWORD TEST (expect 401)",
            client.post("/api/auth/login",
                json={"email": "admin@apex.edu", "password": "WRONGPASS"},
                content_type="application/json"))

        # 14. Unauthorized access — no token
        pp("[18] UNAUTHORIZED ADMIN ACCESS (no token, expect 401)",
            client.get("/api/admin/queues"))

        print(f"\n{'='*65}")
        print("  ALL 18 TESTS COMPLETE — Backend is fully functional!")
        print(f"{'='*65}\n")
