# Soho Transport API — Short Reference

Authentication
- All protected endpoints require a Bearer JWT access token in `Authorization: Bearer <token>`.
- Tokens are created using `src/utils/token.js` with claims: `sub` (user id), `role`, `firstName`, `lastName`.
- Roles used: `Admin`, `Transport Manager`, `Driver`, `Assistant` (or `Bus Assistant`), `Parent`, `School Admin`.

Important Endpoints

- Health & Metrics
  - `GET /health` — basic health check (no auth)
  - `GET /metrics` — Prometheus metrics (exposes `scheduler_runs_total`, `scheduler_errors_total`, `trips_created_total`, `trips_skipped_total`, `attendance_updates_total`)

- Scheduler & Trips
  - `POST /api/trips/generate/today` — Manual recovery/manual generation for today's trips. Requires role: `Admin` or `Transport Manager`.
  - `GET /api/scheduler/health` — Scheduler logs and recent run status. Requires role: `Admin`.
  - `GET /api/trips/date/:date` — List trips for a date. Requires authentication.
  - `POST /api/trips` — Create trip (Transport Manager/School Admin routes protected under `/api/transport-manager`).

- Attendance
  - `PATCH /api/attendance/:id` — Update a single attendance record. Allowed roles: `Driver`, `Bus Assistant`, `Transport Manager`, `Admin`.
  - `POST /api/attendance/bulk` — Bulk update attendance. Allowed roles: `Driver`, `Bus Assistant`, `Transport Manager`, `Admin`.
  - `GET /api/attendance/trips` — Get trips for attendance for today/date. Requires authentication.
  - Attendance updates are idempotent and use optimistic locking on `updatedAt` to avoid lost updates.

- Real-time
  - WebSocket: `ws://<host>/ws?token=<ACCESS_TOKEN>` — Authenticated WS connection. Roles allowed: `Admin`, `Transport Manager`, `Driver`, `Assistant`, `Bus Assistant`.
    - Events: `attendance_marked` — payload includes `tripId`, `studentId`, `boardingStatus`, `dropoffStatus`, `tripType`, `attendanceDate`.
    - WS enforces per-client authorization: Admin/TM receive all events; Drivers/Assistants receive only events for trips they are assigned to.
  - SSE: `GET /api/realtime/sse/attendance` — SSE stream for `attendance_marked` events. Requires role: `Admin` or `Transport Manager`.

- Users & Roles
  - `GET /api/users` — List users. Requires `Transport Manager` or `School Admin`.
  - `GET /api/auth/me` — Get current user details (requires auth).

Notes on Idempotency & Immutability
- Trips are created with `trip_uuid` and JSON snapshots for route, students, and vehicle to preserve historical state.
- The scheduler will NOT modify existing trip rows to preserve immutability; it logs skipped updates to `audit_logs`.
- DB-level unique constraint exists for route+date+session to prevent duplicates. Apply migrations from `backend/src/migration`.

Operational
- Metrics can be used to alert on scheduler failures and Redis availability. See `deploy/monitoring/prometheus_rules.yml` for example alert rules.
- Use `POST /api/trips/generate/today` for manual recovery if scheduler missed runs.

Example: manual generate with curl (Admin token required)

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/trips/generate/today
```

Security
- Ensure `JWT_SECRET` is rotated safely and kept secret.
- Only `Admin` and `Transport Manager` should have broad system privileges like manual generation and scheduler health.

Contact
- See `backend/OPERATIONAL_RUNBOOK.md` for runbook and escalation.
