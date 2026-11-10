import os
import sys

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app import create_app
from app.extensions import socketio, mongo
from app.models import init_indexes
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.counter import CounterModel, CounterStatus
from app.models.queue import QueueModel
from app.models.user import UserModel, UserRole
from app.services.auth_service import AuthService


def seed_demo_data(app):
    """Seed initial college demo organization, departments, queues, counters, and users."""
    with app.app_context():
        db = mongo.get_db()
        if db is None:
            return

        try:
            init_indexes(db)
        except Exception as e:
            print(f"Index initialization warning: {e}")

        # Check if already seeded with new queues
        existing_hosp_queue = QueueModel.find_by_code(db, "HOSP-OPD")
        if existing_hosp_queue:
            print("Demo queues already up to date.")
            return

        # Clean existing demo collections to re-seed fresh multi-domain queues
        db.organizations.delete_many({"code": "APEX"})
        db.departments.delete_many({})
        db.queues.delete_many({})
        db.counters.delete_many({})
        db.users.delete_many({"email": {"$in": ["admin@apex.edu", "staff@apex.edu", "student@apex.edu"]}})
        db.tokens.delete_many({})
        db.token_sequences.delete_many({})

        print("Seeding multi-domain SmartQueue demo data (Hospital, Bank, School/College)...")
        # 1. Create Organization
        org = OrganizationModel.create(
            db,
            name="SmartQueue Multi-Service Hub",
            code="APEX",
            contact_email="support@smartqueue.org",
            working_hours={"start": "08:30", "end": "18:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]},
            settings={
                "allow_concurrent_tokens": True,
                "default_estimated_service_time": 5,
                "max_daily_tokens_per_student": 10
            }
        )
        org_id = org["id"]

        # 2. Create Departments for each domain
        hosp_dept = DepartmentModel.create(
            db, org_id, "Hospital & Clinical Healthcare", "HOSP-DEPT",
            description="General OPD, emergency checkups, and specialist doctor consultations."
        )
        bank_dept = DepartmentModel.create(
            db, org_id, "Retail Banking & Financial Services", "BANK-DEPT",
            description="Cash deposits, withdrawals, cheques, and savings account operations."
        )
        edu_dept = DepartmentModel.create(
            db, org_id, "School & College Academic Services", "EDU-DEPT",
            description="Student admissions, semester fee verification, scholarships, and certificates."
        )

        # 3. Create the 3 Requested Queues
        hosp_queue = QueueModel.create(
            db, org_id, hosp_dept["id"],
            "Hospital OPD & Doctor Consultation Queue", "HOSP-OPD", prefix="HOSP",
            estimated_service_time=10, max_daily_capacity=100
        )
        bank_queue = QueueModel.create(
            db, org_id, bank_dept["id"],
            "Bank Cash & Account Services Queue", "BANK-CASH", prefix="BANK",
            estimated_service_time=5, max_daily_capacity=200
        )
        edu_queue = QueueModel.create(
            db, org_id, edu_dept["id"],
            "School & College Fee & Admission Queue", "EDU-CLG", prefix="EDU",
            estimated_service_time=6, max_daily_capacity=150
        )

        # 4. Create Counters for each Queue
        c1 = CounterModel.create(db, org_id, hosp_dept["id"], "Doctor OPD Room 1", 1)
        c2 = CounterModel.create(db, org_id, hosp_dept["id"], "Doctor OPD Room 2", 2)
        c3 = CounterModel.create(db, org_id, bank_dept["id"], "Cash & Deposit Counter 1", 3)
        c4 = CounterModel.create(db, org_id, bank_dept["id"], "Account Services Desk", 4)
        c5 = CounterModel.create(db, org_id, edu_dept["id"], "Student Admission Desk 1", 5)
        c6 = CounterModel.create(db, org_id, edu_dept["id"], "College Fees & Clearance Desk", 6)

        CounterModel.update_status(db, c1["id"], CounterStatus.OPEN)
        CounterModel.update_status(db, c3["id"], CounterStatus.OPEN)
        CounterModel.update_status(db, c5["id"], CounterStatus.OPEN)

        # 5. Create Demo Users
        # Admin
        AuthService.register_user(
            email="admin@apex.edu",
            password="adminpassword123",
            full_name="Central System Administrator",
            role=UserRole.ADMIN,
            organization_id=org_id,
        )
        # Staff (Hospital Doctor)
        AuthService.register_user(
            email="staff@apex.edu",
            password="staffpassword123",
            full_name="Dr. Robert Vance (Hospital OPD)",
            role=UserRole.STAFF,
            organization_id=org_id,
            department_id=hosp_dept["id"],
            assigned_counter_id=c1["id"],
        )
        # Student / Customer
        AuthService.register_user(
            email="student@apex.edu",
            password="studentpassword123",
            full_name="Alice Johnson",
            role=UserRole.STUDENT,
            organization_id=org_id,
            student_id="STU-2026-042",
        )

        print("Multi-Domain Demo data seeded successfully!")
        print("  - 1. Hospital Queue: Hospital OPD & Doctor Consultation Queue [HOSP]")
        print("  - 2. Bank Queue:     Bank Cash & Account Services Queue [BANK]")
        print("  - 3. College Queue:  School & College Fee & Admission Queue [EDU]")
        print("  - Admin:   admin@apex.edu   / adminpassword123")
        print("  - Staff:   staff@apex.edu   / staffpassword123")
        print("  - Student: student@apex.edu / studentpassword123")


def main():
    env_name = os.getenv("FLASK_ENV", "development")
    port = int(os.getenv("PORT", 5000))
    debug = env_name == "development"

    print("=" * 60)
    print("  SMART QUEUE SYSTEM — BACKEND API & SOCKET.IO SERVER")
    print(f"  Environment: {env_name}")
    print(f"  Listening on: http://127.0.0.1:{port}")
    print("=" * 60)

    app = create_app(env_name)

    # Seed demo data if flag provided, mock db in use, or AUTO_SEED_DEMO is true
    if "--seed" in sys.argv or getattr(mongo, "is_mock", False) or os.getenv("AUTO_SEED_DEMO", "false").lower() == "true":
        seed_demo_data(app)

    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True,
    )


if __name__ == "__main__":
    main()
