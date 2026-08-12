# Backend realtime & scheduler quickstart

This README covers running the backend with Redis and MySQL for realtime features.

Prerequisites:
- Docker & Docker Compose

Start services (from repo root):

```bash
docker compose -f deploy/docker/docker-compose.dev.yml up --build
```

This will start MySQL (port 3307), Redis (6379), and the backend (5000).

Apply DB migrations (run inside backend container or locally pointing to DB):

```bash
# inside backend container
node ./src/migration/apply_migrations.js
# or locally
mysql -h 127.0.0.1 -P 3307 -u soho -psoho soho_dev < backend/src/migration/schema.sql
mysql -h 127.0.0.1 -P 3307 -u soho -psoho soho_dev < backend/src/migration/20260806_trip_snapshots.sql
```

SSE endpoint (Transport Manager / Admin):
- `GET /api/realtime/sse/attendance` (requires Authorization bearer token)

WebSocket endpoint:
- `ws://localhost:5000/ws?token=<ACCESS_TOKEN>`

Progress API:
- `GET /api/trips/:tripId/progress` (requires Authorization bearer token)

Manual trip generation (Admin or Transport Manager):
- `POST /api/trips/generate/today` (requires Authorization bearer token)

Health endpoints:
- `GET /health` - basic app health
- `GET /api/scheduler/health` - scheduler logs (Admin only)

