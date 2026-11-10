# Smart Queue System — Complete API Reference

All backend API endpoints are versioned under `/api`. Standard responses follow uniform JSON contracts:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "details": { ... },
  "code": "ERROR_CODE"
}
```

---

## 🔐 Authentication Endpoints (`/api/auth`)

### 1. Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth:** Public
- **Request Body:**
```json
{
  "email": "student@apex.edu",
  "password": "password123",
  "full_name": "Jane Student",
  "role": "student",
  "organization_id": "6ad4643f28a6a9e7f739177f",
  "student_id": "CS-2026-042"
}
```
- **Response:** `201 Created` with created user and JWT tokens (`access_token`, `refresh_token`).

### 2. Login
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth:** Public
- **Request Body:**
```json
{
  "email": "student@apex.edu",
  "password": "password123"
}
```
- **Response:** `200 OK` with user profile and JWT token pair.

### 3. Refresh Access Token
- **Method:** `POST`
- **Path:** `/api/auth/refresh`
- **Auth:** `Bearer <refresh_token>`
- **Response:** `200 OK` with new `access_token`.

### 4. Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth:** `Bearer <access_token>`
- **Response:** `200 OK` with active user details.

### 5. Register Device Push Token
- **Method:** `POST`
- **Path:** `/api/auth/fcm-token`
- **Auth:** `Bearer <access_token>`
- **Request Body:**
```json
{
  "fcm_token": "fcm_registration_token_string..."
}
```

---

## 👥 Student & Visitor Endpoints (`/api/student`)

### 1. List Available Queues
- **Method:** `GET`
- **Path:** `/api/student/services?organization_id=<org_id>`
- **Auth:** Optional

### 2. Join Queue
- **Method:** `POST`
- **Path:** `/api/student/join`
- **Auth:** Optional (Uses authenticated user ID if logged in; accepts `guest_name` and `guest_phone` if visitor)
- **Request Body:**
```json
{
  "queue_id": "6ad4643f28a6a9e7f739177f",
  "guest_name": "John Visitor",
  "guest_phone": "+1 555-0199"
}
```
- **Response:** `201 Created` with token document, `token_number` (e.g. `VIV-001`), and `estimation` (`position_ahead`, `estimated_wait_minutes`).

### 3. Get Active Token
- **Method:** `GET`
- **Path:** `/api/student/active-token`
- **Auth:** `Bearer <access_token>`
- **Response:** `200 OK` with active token or `null`.

### 4. Get Specific Token Details
- **Method:** `GET`
- **Path:** `/api/student/token/<token_id>`
- **Auth:** Optional (Validates ownership if token belongs to registered student)

### 5. Cancel Token
- **Method:** `POST`
- **Path:** `/api/student/token/<token_id>/cancel`
- **Auth:** Optional
- **Request Body:**
```json
{
  "reason": "Appointment rescheduled"
}
```

### 6. Token History
- **Method:** `GET`
- **Path:** `/api/student/history?limit=20`
- **Auth:** `Bearer <access_token>`

---

## 🖥️ Staff Desk Endpoints (`/api/staff`)
*All endpoints require role: `staff` or `admin`.*

### 1. List Assigned Queues & Counters
- **Method:** `GET`
- **Path:** `/api/staff/queues`
- **Path:** `/api/staff/counters`

### 2. Call Next Waiting Token
- **Method:** `POST`
- **Path:** `/api/staff/call-next`
- **Request Body:**
```json
{
  "queue_id": "6ad4643f28a6a9e7f739177f",
  "counter_id": "6ad4643f28a6a9e7f7391780"
}
```
- **Behavior:** Atomically claims earliest waiting token, sets counter to `busy`, triggers FCM and socket alerts.

### 3. Start Service
- **Method:** `POST`
- **Path:** `/api/staff/start-service`
- **Request Body:**
```json
{
  "token_id": "6ad4643f28a6a9e7f7391781"
}
```

### 4. Complete Service
- **Method:** `POST`
- **Path:** `/api/staff/complete-service`
- **Request Body:**
```json
{
  "token_id": "6ad4643f28a6a9e7f7391781",
  "counter_id": "6ad4643f28a6a9e7f7391780"
}
```
- **Behavior:** Marks token `completed`, releases counter status back to `open`, broadcasts update.

### 5. Skip / No-Show Token
- **Method:** `POST`
- **Path:** `/api/staff/skip-token`
- **Request Body:**
```json
{
  "token_id": "6ad4643f28a6a9e7f7391781",
  "counter_id": "6ad4643f28a6a9e7f7391780",
  "reason": "Student did not show up after 3 calls"
}
```

### 6. Update Counter Availability
- **Method:** `PUT`
- **Path:** `/api/staff/counter/status`
- **Request Body:**
```json
{
  "counter_id": "6ad4643f28a6a9e7f7391780",
  "status": "open"
}
```
*(Status values: `open`, `busy`, `closed`)*

### 7. Pause / Resume Queue
- **Method:** `PUT`
- **Path:** `/api/staff/queue/<queue_id>/status`
- **Request Body:**
```json
{
  "status": "paused"
}
```

---

## 📊 Administration Endpoints (`/api/admin`)
*All endpoints require role: `admin`.*

### 1. Operational Reports
- **Method:** `GET`
- **Path:** `/api/admin/reports?organization_id=<org_id>`
- **Response:**
```json
{
  "summary": {
    "total_tokens": 142,
    "completed": 128,
    "cancelled": 6,
    "skipped": 4,
    "waiting": 3,
    "serving": 1,
    "completion_rate_percent": 90.1
  }
}
```

### 2. Manage Entities
- `GET`, `POST` `/api/admin/organizations`
- `GET`, `POST` `/api/admin/departments`
- `GET`, `POST` `/api/admin/counters`
- `GET`, `POST` `/api/admin/queues`
- `GET` `/api/admin/staff`
- `POST` `/api/admin/assign-staff`

---

## 📡 Public Live Queue & QR (`/api/queue`)

### 1. Live Public Queue Status
- **Method:** `GET`
- **Path:** `/api/queue/status/<queue_id>`
- **Auth:** Public

### 2. QR Code Resolution
- **Method:** `GET`
- **Path:** `/api/queue/qr/<qr_hash>`
- **Auth:** Public
