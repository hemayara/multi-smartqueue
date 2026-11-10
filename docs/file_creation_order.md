# Smart Queue System — Complete File Creation Order & Traceability Matrix

This document tracks the dependency-aware file creation sequence implemented across the project. Each file was constructed strictly after its underlying dependencies were established and verified.

---

## 📋 Comprehensive File Creation Order

| Phase | # | File Path | Core Responsibility | Upstream Dependencies |
|---|---|---|---|---|
| **Phase 1** | 1 | `README.md` | Central project documentation and quickstart | None |
| | 2 | `.gitignore` | Ignore bytecode, venv, secrets, logs, and node_modules | None |
| | 3 | `backend/requirements.txt` | Python packages (Flask, PyMongo, SocketIO, JWT, Pytest) | None |
| | 4 | `backend/.env.example` | Template for environment configuration | None |
| **Phase 2** | 5 | `backend/app/config.py` | Environment configurations (Dev, Testing, Prod) | `python-dotenv` |
| | 6 | `backend/app/extensions.py` | Singletons for PyMongo, SocketIO, JWT, Bcrypt | `Config`, drivers |
| | 7 | `backend/app/__init__.py` | Application factory `create_app()` and health check | `config.py`, `extensions.py` |
| **Phase 3** | 8 | `backend/app/models/__init__.py` | BSON serialization helpers and index orchestrator | BSON, PyMongo |
| | 9 | `backend/app/models/user.py` | User entity, role constants, and FCM tokens | `serialize_doc` |
| | 10 | `backend/app/models/organization.py` | Organization entity, settings, and working hours | `serialize_doc` |
| | 11 | `backend/app/models/department.py` | Department entity with compound unique code index | `serialize_doc` |
| | 12 | `backend/app/models/counter.py` | Counter station entity and availability statuses | `serialize_doc` |
| | 13 | `backend/app/models/queue.py` | Queue entity, capacities, and QR hash generation | `serialize_doc` |
| | 14 | `backend/app/models/token.py` | Token lifecycle and atomic sequence counter | `serialize_doc`, PyMongo |
| | 15 | `backend/app/models/notification.py`| Notification delivery logs and idempotency keys | `serialize_doc` |
| **Phase 4** | 16 | `backend/app/schemas/__init__.py` | Marshmallow schema validation execution helper | Marshmallow |
| | 17 | `backend/app/schemas/auth_schema.py`| Registration, login, and FCM token input schemas | `UserRole` |
| | 18 | `backend/app/schemas/token_schema.py`| Join queue, cancel, and call next input schemas | `QueueStatus`, `CounterStatus`|
| | 19 | `backend/app/utils/__init__.py` | Utils module exports | None |
| | 20 | `backend/app/utils/responses.py` | Standardized JSON response formatters | `jsonify` |
| | 21 | `backend/app/middleware/__init__.py`| Middleware module exports | None |
| | 22 | `backend/app/middleware/permissions.py`| RBAC role guard, organization isolation, token ownership | `UserModel`, JWT |
| **Phase 5** | 23 | `backend/app/services/__init__.py` | Business service package exports | None |
| | 24 | `backend/app/services/auth_service.py`| User registration, login, and JWT issuance | `bcrypt`, `UserModel`, JWT |
| | 25 | `backend/app/services/wait_time_service.py`| Live wait time and position estimation algorithm | `TokenModel`, `CounterModel` |
| | 26 | `backend/app/services/notification_service.py`| FCM push notification dispatcher and idempotency | `NotificationModel`, FCM |
| | 27 | `backend/app/services/token_service.py`| Token issuance, cancellation, and history retrieval | `TokenModel`, `WaitTimeService`|
| | 28 | `backend/app/services/queue_service.py`| Atomic call next, service lifecycle, and pause/resume | `TokenModel`, `QueueModel` |
| **Phase 6** | 29 | `backend/app/routes/__init__.py` | Routes package exports | None |
| | 30 | `backend/app/routes/auth.py` | `/api/auth` (register, login, me, fcm-token) | `AuthService`, Schemas |
| | 31 | `backend/app/routes/queue.py` | `/api/queue` (public status, QR lookup) | `QueueService`, Models |
| | 32 | `backend/app/routes/student.py` | `/api/student` (join, active token, cancel, history)| `TokenService`, Permissions |
| | 33 | `backend/app/routes/staff.py` | `/api/staff` (call next, start, complete, skip, pause)| `QueueService`, Permissions |
| | 34 | `backend/app/routes/admin.py` | `/api/admin` (orgs, depts, counters, queues, reports) | Models, Permissions |
| **Phase 7** | 35 | `backend/app/sockets/__init__.py` | Sockets exports | None |
| | 36 | `backend/app/sockets/queue_events.py`| Socket room join/leave, broadcast, state sync | `socketio`, `QueueService` |
| **Phase 8** | 37 | `backend/app.py` | WSGI export and database index initialization | `create_app`, `socketio` |
| | 38 | `backend/run.py` | Server runner and demo data seeder | `app.py`, `socketio` |
| **Phase 9** | 39 | `frontend/package.json` | React 18, Vite, Tailwind, Socket.IO client, Axios | Node ecosystem |
| | 40 | `frontend/vite.config.js` | Vite development server and API reverse proxy | Vite, React plugin |
| | 41 | `frontend/index.html` | HTML5 root document and typography | Fonts, manifest |
| | 42 | `frontend/.env.example` | Frontend environment variables | None |
| | 43 | `frontend/src/styles/global.css` | Tailwind directives, glassmorphic card utilities | Tailwind CSS |
| | 44 | `frontend/src/main.jsx` | React DOM mount entry | `App.jsx`, `global.css` |
| | 45 | `frontend/src/App.jsx` | AuthContext provider and React Router tree | Routes, Navbar, Pages |
| **Phase 10**| 46 | `frontend/src/api/client.js` | Axios HTTP client with JWT interceptors | Axios |
| | 47 | `frontend/src/components/Navbar.jsx` | Header with role-based navigation links | `useAuth`, Lucide React |
| | 48 | `frontend/src/components/ProtectedRoute.jsx`| Route guard validating roles and login state | `useAuth`, `Navigate` |
| | 49 | `frontend/src/components/TokenCard.jsx`| Real-time token display, QR code, and cancel button | `qrcode.react`, Lucide |
| | 50 | `frontend/src/components/QueueStatus.jsx`| Public queue display monitor and upcoming tokens | Lucide React |
| | 51 | `frontend/src/hooks/useQueueSocket.js`| Socket.IO subscription, chime, and recovery hook | `socket.io-client` |
| **Phase 11**| 52 | `frontend/src/pages/Login.jsx` | User login screen with quick demo accounts | `apiClient`, `useAuth` |
| | 53 | `frontend/src/pages/Register.jsx` | User registration screen with role selection | `apiClient`, `useAuth` |
| | 54 | `frontend/src/pages/StudentDashboard.jsx`| Visitor dashboard, active token, open queues | `TokenCard`, `apiClient` |
| | 55 | `frontend/src/pages/JoinQueue.jsx` | Queue entry form with QR hash detection | `apiClient`, `useAuth` |
| | 56 | `frontend/src/pages/MyToken.jsx` | Live token tracking and browser notification opt-in | `TokenCard`, `useQueueSocket` |
| | 57 | `frontend/src/pages/StaffDashboard.jsx` | Staff service desk with Call Next and counter toggles| `apiClient`, `useQueueSocket` |
| | 58 | `frontend/src/pages/AdminDashboard.jsx` | Analytics, queue management, and QR poster printer | `apiClient`, `QRCodeSVG` |
| | 59 | `frontend/src/pages/NotFound.jsx` | 404 page | Lucide React, Router |
| **Phase 12**| -- | `frontend/src/services/notification.js`| Browser Notification API and FCM device registration | `Notification` |
| | -- | `frontend/public/firebase-messaging-sw.js`| Background service worker for push alerts | Web Worker API |
| **Phase 13**| 60 | `backend/tests/conftest.py` | Pytest fixtures and mock client initialization | `pytest`, `mongomock` |
| | 61 | `backend/tests/test_auth.py` | Unit & integration tests for authentication and RBAC | Pytest |
| | 62 | `backend/tests/test_tokens.py` | Unit & integration tests for atomic token generation | Pytest |
| | 63 | `backend/tests/test_queue.py` | End-to-end tests for queue lifecycle & advance | Pytest |
| **Phase 14**| 64 | `docs/architecture.md` | Architectural specification and diagrams | None |
| | 65 | `docs/file_creation_order.md` | Traceability matrix and file creation record | None |
| | 66 | `docs/api_documentation.md` | API endpoint specification and payloads | None |
| | 67 | `docs/testing_guide.md` | Testing instructions and verification suite | None |
