# Smart Queue System (Multi-SmartQueue)

A responsive, production-ready digital queue management application designed for college laboratories, student fee payment windows, departmental advising, admissions, hospitals, and organizational service centers.

---

## 🌟 Key Features

### For Students / Visitors (Public & Authenticated)
- **Instant Queue Joining:** Join directly from the web application or by scanning a dynamic QR code placed at a service desk.
- **Unique Atomic Token Numbers:** Monotonically increasing, collision-free token numbers per organization, queue, and day (e.g., `OSV-001`, `FEE-042`).
- **Live Queue Tracking:** View position ahead, currently serving token, and algorithmic estimated wait times.
- **Real-Time Live Updates:** Instant Socket.IO event notifications when tokens are called, served, completed, or cancelled without page refreshes.
- **Push & Browser Notifications:** Native Web Notifications and optional Firebase Cloud Messaging (FCM) alerts when your turn approaches.
- **Token Management:** Cancel active tokens when permitted; inspect complete historical tokens with status timestamps.

### For Staff / Counter Operators
- **Service Desk Station:** Multi-counter and queue selector with live operating metrics.
- **Token Lifecycle Controls:** Call Next, Start Service, Complete Service, Skip / No-Show, and Recall tokens.
- **Counter Availability Controls:** One-click toggles between **Open**, **Busy**, and **Closed**.
- **Queue Flow Controls:** Emergency pause and resume queues with broadcasted student alerts.

### For Organization Administrators
- **Multi-Tenant Hierarchy:** Organization ➔ Departments ➔ Queues ➔ Counters ➔ Staff assignments.
- **Working Hours & Policies:** Enforce queue open/close times, daily capacity limits, and duplicate active token prevention policies.
- **QR Poster Printing:** Instant generation and print-ready QR codes for physical counter displays.
- **Operational Analytics:** Real-time metrics including total tokens issued, completed, cancelled, skipped, and overall completion rate.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.10+, Flask 3.0, Flask-SocketIO 5.7, PyMongo 4.19, Flask-JWT-Extended 4.7, Flask-Bcrypt, Marshmallow, Firebase Admin SDK |
| **Database** | MongoDB 6.0+ (Transactions, unique compound indexes, atomic `$inc` counters) |
| **Real-time Engine** | Socket.IO / WebSocket transport with room-based pub/sub |
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Axios, Socket.IO Client, Lucide React, QRCode.react |
| **Testing** | Pytest, Mongomock |

---

## 📁 Repository Structure

```
smart_queue/
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask App Factory & extension bindings
│   │   ├── config.py             # Development, Testing, Production configurations
│   │   ├── extensions.py         # PyMongo, SocketIO, JWT, Bcrypt extensions
│   │   ├── models/               # MongoDB models with validation & indexes
│   │   │   ├── user.py
│   │   │   ├── organization.py
│   │   │   ├── department.py
│   │   │   ├── counter.py
│   │   │   ├── queue.py
│   │   │   ├── token.py          # Atomic sequence allocator
│   │   │   └── notification.py
│   │   ├── schemas/              # Marshmallow input validation schemas
│   │   ├── services/             # Core business logic layer
│   │   │   ├── auth_service.py
│   │   │   ├── token_service.py
│   │   │   ├── queue_service.py
│   │   │   ├── wait_time_service.py
│   │   │   └── notification_service.py
│   │   ├── routes/               # Modular Blueprint route handlers
│   │   │   ├── auth.py
│   │   │   ├── student.py
│   │   │   ├── staff.py
│   │   │   ├── admin.py
│   │   │   └── queue.py
│   │   ├── sockets/              # Socket.IO room events & push triggers
│   │   │   └── queue_events.py
│   │   ├── middleware/           # RBAC & organization isolation guards
│   │   └── utils/                # Standardized JSON responses & helpers
│   ├── tests/                    # Automated Pytest suite (15 unit/concurrency tests)
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   ├── app.py                    # WSGI app export
│   └── run.py                    # Server runner with demo seeder
├── frontend/
│   ├── public/                   # Static assets & PWA manifest
│   ├── src/
│   │   ├── api/                  # Axios HTTP client with interceptors
│   │   ├── components/           # Reusable UI components (Navbar, TokenCard, QueueStatus, etc.)
│   │   ├── hooks/                # useQueueSocket custom hook
│   │   ├── pages/                # Role-based dashboard & queue views
│   │   ├── services/             # Notification service client
│   │   ├── styles/               # Tailwind CSS & global animations
│   │   ├── App.jsx               # Route orchestrator & AuthContext
│   │   └── main.jsx              # React DOM entry point
│   ├── package.json              # Frontend npm dependencies
│   ├── vite.config.js            # Vite build configuration
│   └── .env.example              # Frontend environment template
├── docs/
│   ├── architecture.md           # Architectural specification
│   ├── file_creation_order.md    # Complete traceability matrix
│   ├── api_documentation.md      # API reference & payload contracts
│   └── testing_guide.md          # QA & testing guide
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MongoDB Community Server (or MongoDB Atlas connection URI)

### 2. Backend Setup & Startup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows PowerShell:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run server with initial demo data seeded
python run.py --seed
```
The backend API and Socket.IO server will start at `http://127.0.0.1:5000`.

### 3. Frontend Setup & Startup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start Vite development server
npm run dev
```
The frontend web application will start at `http://localhost:5173`.

---

## 🔑 Pre-Seeded Demo Credentials

When started with `python run.py --seed`, the system automatically provisions an organization (`Apex Institute of Technology`), 3 departments (`CS Labs`, `Fees & Accounts`, `Student Services`), 5 counters, and 3 pre-configured user accounts:

| Role | Email Address | Password | Permissions & Dashboard |
|---|---|---|---|
| **Administrator** | `admin@apex.edu` | `adminpassword123` | Full access to `/admin`: view reports, configure departments, counters, and print QR codes |
| **Faculty / Staff** | `staff@apex.edu` | `staffpassword123` | Access to `/staff`: call next token, start service, complete, skip, pause queue |
| **Student** | `student@apex.edu` | `studentpassword123` | Access to `/`: join queue, view active token, cancel token, view token history |

*(The login screen also features quick 1-click demo login buttons for instant testing.)*

---

## 🧪 Running Automated Tests

The backend test suite executes in-memory using `mongomock`, validating 15 test cases across authentication, atomic concurrency, wait-time algorithms, and queue lifecycles:

```bash
cd backend
# With virtual environment activated:
python -m pytest -v
```

---

## 🔒 Security Architecture
- **JWT Authentication:** Strict Bearer tokens with configurable expiry and automatic token refresh.
- **Role-Based Access Control (RBAC):** Backend route decorators enforce `@role_required` on all privileged actions.
- **Multi-Tenant Isolation:** Resource access is bound to the user's `organization_id`.
- **Atomic Operations:** Collision-free token sequencing guaranteed via MongoDB atomic `$inc` with unique compound indexing.
