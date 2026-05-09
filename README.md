# Soho Transport Management System

A role-based school transport management platform composed of:
- `Node.js` + `Express` backend
- `React` + `TypeScript` + `Vite` frontend
- `MySQL` database
- JWT authentication with refresh tokens and role-based access control

The application supports multiple user roles, including:
- Parent
- Driver
- Bus Assistant
- Transport Manager
- School Admin

## Overview
This repository contains two separate applications:
- `backend/`: Express REST API, MySQL integration, file uploads, and authentication
- `frontend/`: React SPA with authenticated dashboard flows

The backend routes are mounted under `/api/*`, and the frontend development server proxies requests to the backend.

## Tech Stack
- Frontend: React 19, TypeScript, Vite, React Router
- Backend: Node.js, Express 5, MySQL, bcrypt, jsonwebtoken, helmet, cors, cookie-parser
- Dev tools: nodemon, ESLint, Vite
- Deployment: Docker Compose

## Repository Structure
```text
Soho/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── config/db.js
│       ├── migration/schema.sql
│       ├── controllers/
│       ├── middlewares/
│       ├── routes/
│       ├── services/
│       └── validators/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── src/
│       ├── App.tsx
│       ├── contexts/
│       ├── components/
│       └── lib/
├── docker-compose.yml
└── docs/
    ├── architecture/
    ├── deployment/
    └── postman/
```

## Getting Started
### Prerequisites
- Node.js 18+ (recommended 20+)
- npm 9+
- MySQL 8+

### Install dependencies
```bash
cd backend
npm install
cd ../frontend
npm install
```

### Configure environment files
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Create the database and apply schema
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS soho_transport;"
mysql -u root -p soho_transport < backend/src/migration/schema.sql
```

Then update `backend/.env` so that `DB_NAME` matches your created database.

### Seed number plates
Driver and Bus Assistant registration require existing number plates. Example:
```sql
INSERT INTO number_plates (plate_number, status) VALUES
  ('KDA123A', 'active'),
  ('KDB456B', 'active'),
  ('KDC789C', 'inactive');
```

## Environment Variables
### Backend
Use `backend/.env.example` as a template.

Important variables:
- `PORT` (default `5000`)
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `FRONTEND_ORIGIN`
- Cloudflare R2 upload settings if file uploads are enabled

### Frontend
Use `frontend/.env.example` as a template.

Example:
```env
VITE_BACKEND_URL=http://localhost:5000
# Optional: use full backend URL instead of Vite proxy.
# VITE_API_BASE_URL=http://localhost:5000/api
```

## Running Locally
### Backend
```bash
cd backend
npm run dev
```
- Backend listens on `http://localhost:5000` by default.
- API root: `http://localhost:5000/api`

### Frontend
```bash
cd frontend
npm run dev
```
- Frontend dev server runs on `http://localhost:5173`
- API requests are proxied to the backend.

## Docker
### Development
From the repository root:
```bash
docker compose up --build
```
- The `frontend` service is available at `http://localhost:5173`

### Production frontend
```bash
docker compose --profile prod up --build frontend-prod
```
- The production frontend is available at `http://localhost:8080`

## API Summary
Authentication endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Example module endpoints:
- `POST /api/fuel-maintenance`
- `GET /api/fuel-maintenance`
- `GET /api/students`
- `POST /api/students`
- `POST /api/complaints`
- `POST /api/compliance-documents`
- `POST /api/incidents`

Health check:
- `GET /health`

## Documentation
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Deployment: `docs/deployment/DEPLOYMENT.md`
- Postman collection: `docs/postman/Soho-Transport-API.postman_collection.json`
- Postman environment: `docs/postman/Soho-Transport-Local.postman_environment.json`
