# Smart Queue System — Architecture & Engineering Specification

This document details the architectural principles, data flow, concurrency controls, multi-tenant isolation, real-time event distribution, and security design implemented across the Smart Queue System.

---

## 🏛️ High-Level System Architecture

```
                          ┌─────────────────────────────────────┐
                          │     React + Vite Web Client / PWA   │
                          │ (Students, Staff, Kiosk, Admin)     │
                          └───────┬─────────────────────▲───────┘
                                  │ HTTP REST (JSON)    │ WebSockets (Socket.IO)
                                  ▼                     │
┌─────────────────────────────────┴─────────────────────┴──────────────────┐
│                             Flask Application Layer                      │
│                                                                          │
│  ┌───────────────────────┐  ┌─────────────────────┐  ┌────────────────┐ │
│  │     Route Blueprints  │  │   RBAC Middleware   │  │ Socket.IO Hub  │ │
│  │ (Auth, Queue, Student,│  │(Role Guard, Tenant  │  │(Room Management│ │
│  │  Staff, Admin)        │  │ Isolation, Token)   │  │ Reconnect Sync)│ │
│  └───────────┬───────────┘  └──────────┬──────────┘  └────────▲───────┘ │
│              │                         │                      │         │
│              ▼                         ▼                      │         │
│  ┌────────────────────────────────────────────────────────────┴───────┐ │
│  │                        Business Service Layer                      │ │
│  │ (AuthService, TokenService, QueueService, WaitTimeService, FCM)    │ │
│  └─────────────────────────────────────┬──────────────────────────────┘ │
└────────────────────────────────────────┼─────────────────────────────────┘
                                         │ PyMongo Driver
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │                MongoDB Database                │
                 │                                                │
                 │  - users             - token_sequences ($inc)  │
                 │  - organizations     - tokens (Compound Unique)│
                 │  - departments       - notifications (TTL/Key) │
                 │  - counters          - queues                  │
                 └────────────────────────────────────────────────┘
```

---

## 🏢 Multi-Tenant Domain Hierarchy

The data model enforces strict multi-tenancy from the database index level up through routing middleware:

1. **Organization (Tenant):**
   - Represents the college, hospital, bank, or organization.
   - Holds global operational policies: `allow_concurrent_tokens`, `max_daily_tokens_per_student`, `working_hours`.
2. **Departments:**
   - Organizational departments (e.g. `CS-LAB`, `FEES`, `ADMISSIONS`).
   - Group related counters and queues.
3. **Counters (Service Stations):**
   - Physical or logical windows where staff members call and serve students.
   - States: `OPEN`, `BUSY`, `CLOSED`.
   - Directly linked to the active token currently being served.
4. **Queues:**
   - Dedicated waiting streams (e.g. `OS-VIVA`, `TUITION-FEE`).
   - Prefix (e.g. `VIV`, `FEE`) and dynamic QR code seed hash.
   - Configurable estimated service duration and daily capacity cap.
5. **Tokens:**
   - Individual queue tickets (e.g. `VIV-001`, `VIV-002`).
   - States: `WAITING` ➔ `CALLED` ➔ `SERVING` ➔ `COMPLETED` (or `CANCELLED`, `SKIPPED`).

---

## ⚡ Concurrency & Atomic Sequence Allocation

### The Problem
Under high load, concurrent students joining a queue simultaneously must never receive the same token number, and multiple staff members clicking **Call Next** at the same millisecond must never claim the same student.

### The Solution
1. **Atomic Sequence Generation:**
   Tokens use a dedicated MongoDB sequence collection (`token_sequences`) operated via `find_one_and_update` with an atomic `$inc: {"last_seq": 1}` and `upsert=True`:
   ```python
   seq_doc = db.token_sequences.find_one_and_update(
       {"organization_id": org_id, "queue_id": queue_id, "service_date": "2026-10-18"},
       {"$inc": {"last_seq": 1}},
       upsert=True,
       return_document=ReturnDocument.AFTER
   )
   ```
   This guarantees strictly monotonic, gapless, zero-collision sequences without holding application-level mutex locks.

2. **Atomic Token Calling (Race-Condition Free):**
   When multiple staff call next simultaneously:
   ```python
   called_token = db.tokens.find_one_and_update(
       {"queue_id": queue_id, "status": "waiting"},
       {"$set": {"status": "called", "counter_id": counter_id, "called_at": now}},
       sort=[("sequence_number", 1)],
       return_document=ReturnDocument.AFTER
   )
   ```
   MongoDB's document-level write locking guarantees that exactly one staff member claims the earliest waiting student; the other concurrently advancing staff member automatically receives the subsequent token.

---

## ⏱️ Dynamic Wait-Time Estimation Algorithm

Estimated wait times are computed dynamically based on live queue and counter telemetry:

$$\text{Estimated Wait (minutes)} = \text{round}\left(\frac{\text{Position Ahead} + 1}{\text{Active Counters}} \times \text{Avg Service Time}\right)$$

- **Position Ahead:** Calculated from the count of active tokens in the queue with lower sequence numbers.
- **Active Counters:** Dynamically counted from counters currently in `OPEN` or `BUSY` status for the target department.
- **Corner Cases:**
  - If queue status is `PAUSED`: Wait times freeze with an informative status label.
  - If active counters = `0`: System alerts student that counters are currently offline and estimation is pending.

---

## 📡 Real-Time WebSocket Room Topology

To prevent network congestion, Socket.IO channels are segregated into rooms:
- **`queue_<queue_id>`:** Public room broadcasted to whenever tokens are created, called, served, completed, skipped, or when queues are paused/resumed.
- **`user_<user_id>`:** Private authenticated channel for direct student turn alerts.
- **Reconnection Recovery (`request_queue_state`):**
  If a student or kiosk client experiences intermittent network drops, upon reconnecting it immediately emits `request_queue_state` to pull the authoritative server state.
