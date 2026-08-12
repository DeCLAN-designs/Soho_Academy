# Soho Transport Backend — Operational Runbook

This runbook describes deployment, migrations, health checks, monitoring, and recovery steps for the backend services (trips scheduler, realtime, attendance).

Prerequisites
- MySQL instance accessible (ensure credentials in env: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
- Redis instance accessible (env: `REDIS_URL`).
- Environment variables: `JWT_SECRET`, `APP_TIMEZONE` (default Africa/Nairobi), optional `PORT`, `NODE_ENV`.
- Prometheus scraping the `/metrics` endpoint on the backend.

Apply database migrations
1. Back up the production database before any migration.
2. Apply baseline schema files in `backend/src/migration/` in the ordering required by your migration plan. Example:

```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/migration/schema_part1_core.sql
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/migration/schema_part2_routes.sql
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < backend/src/migration/20260806_trip_snapshots.sql
```

3. Verify uniqueness constraints and new columns:
- `trip_monitoring.trip_uuid` exists
- JSON snapshot columns present (route_snapshot_json, student_snapshot_json, vehicle_snapshot_json)
- Unique index `uk_trip_route_date_session` enforced

Start services
- Recommended Docker Compose (dev/prod variants under `deploy/docker/`):

```bash
# Development (with local code mounts)
docker compose -f deploy/docker/docker-compose.dev.yml up --build -d

# Production (ensure envs are set in env file or orchestration)
docker compose -f deploy/docker/docker-compose.prod.yml up --build -d
```

- Confirm Redis is reachable using `redis-cli -u $REDIS_URL PING` (should return PONG).

Health checks
- App health: `GET /health` (returns 200)
- Scheduler health: `GET /api/scheduler/health` (Admin only)
- Prometheus metrics: `GET /metrics` (exposes `scheduler_runs_total`, `scheduler_errors_total`, `trips_created_total`, `trips_skipped_total`, `attendance_updates_total`)

Common operational tasks
- Trigger manual generation (Admin/TM): `POST /api/trips/generate/today` — requires bearer token with role `Admin` or `Transport Manager`.
- Recover missing trips: the manual endpoint will call `generateDailyTrips()` which is idempotent and will create missing trips for the date.
- Replay events: the `event_store` table stores historical events; use it to rebuild caches if needed.

Troubleshooting
- Scheduler did not run (no trips created):
  - Check scheduler logs and `scheduler_runs_total` and `scheduler_errors_total` metrics.
  - Ensure `node-cron` is running in the backend process (the server process must be running continuously).
  - Verify DB connectivity and permissions for the scheduler process.

- Duplicate trip creation observed:
  - Verify unique index `uk_trip_route_date_session` exists in DB.
  - Confirm no manual scripts are inserting conflicting rows.

- Realtime updates not arriving:
  - Verify `REDIS_URL` is configured and Redis is reachable.
  - Check `redis_exporter` or Redis logs for connection errors.
  - Confirm WebSocket path `/ws` accepts connections and that tokens provided are valid.

Runbook for emergency recovery
1. If scheduler failed repeatedly and trips are missing for today:
  - Run manual generation (Admin): `POST /api/trips/generate/today`.
  - If generation still fails due to schema mismatch, restore DB from backup, apply migrations in a local environment for validation, then apply to production.
2. If Redis is down:
  - Promote a Redis replica or restart Redis service.
  - If using Redis for cached trip progress, accept transient missing progress API results until Redis is healthy — trip data remains in MySQL.

Maintenance checklist
- Backup DB nightly (use RDS/managed snapshot or mysqldump)
- Rotate `JWT_SECRET` carefully (coordinate with clients; short TTLs help)
- Monitor `scheduler_errors_total` and alert on sustained increase
- Periodic test of manual recovery path in staging

Contact & escalation
- Primary: Platform/DevOps on-call
- Secondary: Backend owner / Transport engineering lead

Appendix
- Locations of interest:
  - `backend/src/jobs/dailyTrips.job.js` (scheduler)
  - `backend/src/services/trips.service.js` (trip generation + snapshots)
  - `backend/src/services/studentAttendance.service.js` (attendance updates + optimistic locking)
  - `backend/src/utils/realtime.js` (WebSocket + Redis pub/sub)
  - `backend/src/utils/metrics.js` (Prometheus metrics)

