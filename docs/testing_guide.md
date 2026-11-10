# Smart Queue System — Comprehensive Testing & QA Guide

This guide details the test suites, concurrency verifications, and automated quality assurance checks configured for the Smart Queue System.

---

## 🧪 Automated Pytest Test Suite

The test suite runs with in-memory `mongomock`, executing without requiring a live external database or network dependencies.

### Running All Tests
```bash
cd backend
# With virtual environment activated:
python -m pytest -v
```

### Running Specific Test Modules
```bash
# Authentication & RBAC permissions:
python -m pytest tests/test_auth.py -v

# Token generation, estimation, and concurrency:
python -m pytest tests/test_tokens.py -v

# Queue lifecycle, advancing, and notification deduplication:
python -m pytest tests/test_queue.py -v
```

---

## 🔬 Test Coverage Matrix

| Test Module | Test Name | Validated Behavior |
|---|---|---|
| `test_auth.py` | `test_user_registration_success` | Valid registration creates user document and issues JWT token pair. |
| `test_auth.py` | `test_duplicate_email_registration_rejected`| Prevents duplicate account creation with `400 Bad Request`. |
| `test_auth.py` | `test_login_success_and_failure` | Validates bcrypt hash verification on correct and incorrect passwords. |
| `test_auth.py` | `test_current_user_profile` | Verifies `GET /api/auth/me` with Bearer token header. |
| `test_auth.py` | `test_role_permissions_enforcement` | Verifies that Students cannot access Staff/Admin endpoints (`403 Forbidden`). |
| `test_tokens.py`| `test_atomic_token_allocation` | Verifies sequential non-colliding token issuance (`OSV-001`, `OSV-002`). |
| `test_tokens.py`| `test_duplicate_active_token_prevention` | Enforces organization policy against concurrent active tokens per user. |
| `test_tokens.py`| `test_token_cancellation` | Verifies student token cancellation with reason recording. |
| `test_tokens.py`| `test_token_wait_time_estimation` | Verifies algorithmic wait time scaling based on queue depth and open counters. |
| `test_tokens.py`| `test_concurrent_token_allocation` | **Concurrency stress test:** Issues 10 tokens simultaneously across a multi-threaded pool, asserting zero collisions. |
| `test_queue.py` | `test_queue_advance_lifecycle` | **End-to-End lifecycle:** Join ➔ Call Next ➔ Start Service ➔ Complete Service. |
| `test_queue.py` | `test_skip_token_flow` | Verifies marking token as No-Show / Skipped and releasing counter to Open. |
| `test_queue.py` | `test_queue_pause_and_resume` | Verifies queue pause disables call-next and resume restores operations. |
| `test_queue.py` | `test_call_next_empty_queue` | Verifies graceful error when calling next on an empty queue. |
| `test_queue.py` | `test_notification_deduplication` | Verifies idempotency keys prevent duplicate push notification dispatches. |

---

## ⚡ Concurrency & Multi-Tenancy Validation

The test suite validates:
1. **Thread-Safe Monotonic Sequences:** `test_concurrent_token_allocation` executes simultaneous calls across threads, verifying that sequence numbers remain strictly sequential and unique.
2. **Context Isolation:** Tests confirm that request context caching on `g` does not leak between different requests or user tokens.
