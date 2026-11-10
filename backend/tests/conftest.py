import pytest
import mongomock
from app import create_app
from app.extensions import mongo
from app.models import init_indexes
from app.models.organization import OrganizationModel
from app.models.department import DepartmentModel
from app.models.counter import CounterModel, CounterStatus
from app.models.queue import QueueModel
from app.models.user import UserRole
from app.services.auth_service import AuthService


@pytest.fixture
def mock_mongo():
    return mongomock.MongoClient()


@pytest.fixture
def app(mock_mongo):
    app = create_app("testing", custom_mongo_client=mock_mongo)
    with app.app_context():
        init_indexes(mock_mongo["smart_queue_test_db"])
        yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(mock_mongo):
    return mock_mongo["smart_queue_test_db"]


@pytest.fixture
def setup_org(app, db):
    org = OrganizationModel.create(
        db,
        name="Apex College of Science",
        code="APEX-SCI",
        settings={"allow_concurrent_tokens": False, "default_estimated_service_time": 5}
    )
    dept = DepartmentModel.create(
        db, org["id"], "Computer Science Lab", "CS-LAB"
    )
    counter = CounterModel.create(
        db, org["id"], dept["id"], "Evaluation Station 1", 1
    )
    CounterModel.update_status(db, counter["id"], CounterStatus.OPEN)
    queue = QueueModel.create(
        db, org["id"], dept["id"], "Operating Systems Viva", "OS-VIVA", prefix="OSV",
        estimated_service_time=5, max_daily_capacity=100
    )

    return {
        "org": org,
        "dept": dept,
        "counter": counter,
        "queue": queue,
    }


@pytest.fixture
def admin_headers(app, setup_org):
    res, _ = AuthService.register_user(
        "admin@apex.edu", "adminpass123", "Chief Admin", role=UserRole.ADMIN,
        organization_id=setup_org["org"]["id"]
    )
    token = res["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}", "user": res["user"]}


@pytest.fixture
def staff_headers(app, setup_org):
    res, _ = AuthService.register_user(
        "staff@apex.edu", "staffpass123", "Faculty Staff", role=UserRole.STAFF,
        organization_id=setup_org["org"]["id"],
        department_id=setup_org["dept"]["id"],
        assigned_counter_id=setup_org["counter"]["id"],
    )
    token = res["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}", "user": res["user"]}


@pytest.fixture
def student_headers(app, setup_org):
    res, _ = AuthService.register_user(
        "student@apex.edu", "studentpass123", "Alice Student", role=UserRole.STUDENT,
        organization_id=setup_org["org"]["id"],
        student_id="CS-101",
    )
    token = res["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}", "user": res["user"]}
