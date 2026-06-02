# Soho Transport Management System

Soho is a role-based school transport management platform for coordinating vehicles, routes, drivers, bus assistants, students, parents, requests, incidents, compliance documents, and transport operations.

The repository contains a React + TypeScript frontend, an Express backend, and a MySQL database schema. The application is organized around dashboards for the main school transport roles:

- Parent
- Driver
- Bus Assistant
- Transport Manager
- School Admin

## Table of Contents

1. [Project Status](#project-status)
2. [Feature Overview](#feature-overview)
3. [Tech Stack](#tech-stack)
4. [Repository Structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Local Setup](#local-setup)
7. [Environment Variables](#environment-variables)
8. [Database Setup](#database-setup)
9. [Running the App](#running-the-app)
10. [Common Development Commands](#common-development-commands)
11. [Frontend Architecture](#frontend-architecture)
12. [Backend Architecture](#backend-architecture)
13. [Authentication and Authorization](#authentication-and-authorization)
14. [API Reference](#api-reference)
15. [Database Model](#database-model)
16. [File Uploads](#file-uploads)
17. [Logging](#logging)
18. [Postman Collection](#postman-collection)
19. [Docker and Deployment](#docker-and-deployment)
20. [Troubleshooting](#troubleshooting)
21. [Known Gaps and Maintenance Notes](#known-gaps-and-maintenance-notes)
22. [Security Notes](#security-notes)

## Project Status

This project is an active application codebase, not a starter template. Several areas are functional end to end, while some dashboard views are still UI-focused or partially wired.

Current core implementation includes:

- User authentication with JWT access tokens and refresh cookies.
- Role-specific dashboards.
- Driver and Bus Assistant operational workflows.
- Transport Manager fleet, request, route, staff, reporting, and incident screens.
- School Admin student lifecycle APIs.
- MySQL persistence for users, vehicles, routes, stops, fuel/maintenance requests, incidents, complaints, compliance documents, students, and route operations.
- Cloudflare R2-compatible upload configuration for profile photos, incident images, complaint attachments, and compliance documents.

## Feature Overview

### Cross-role features

- Login, registration, logout, and authenticated user profile lookup.
- Role-aware dashboard routing.
- Shared dashboard shell, sidebar navigation, and dashboard header.
- Protected frontend routes for authenticated areas.
- Bearer-token API requests from the frontend.
- HTTP-only refresh-token cookie support in the backend.

### Parent

- Parent dashboard area.
- API to fetch children linked to the authenticated parent.
- Intended use: show child transport assignments and transport-related status.

### Driver

- Driver dashboard.
- Attendance screen.
- Fuel and maintenance request workflow.
- Incident and accident reporting.
- Complaints and reports.
- Compliance document uploads.
- Profile screen with profile update support.
- Assigned number plate enforcement for driver-submitted operational requests.

### Bus Assistant

- Bus Assistant dashboard.
- Attendance screen.
- Accident/report workflow.
- Complaint/incident workflow.
- Profile screen.
- Shared operational request permissions with Driver where applicable.

### Transport Manager

Transport Manager has the broadest dashboard surface. Major areas include:

- Fleet
  - Vehicle inventory and vehicle details.
  - Number plate management.
  - Fuel management.
  - Maintenance views.
  - Vehicle document views.
- Requests
  - Fuel requests.
  - Maintenance requests.
  - Route requests.
  - Student requests.
- Routes
  - Route planning.
  - Stops management.
  - Route monitoring.
  - Route optimization.
- Staff
  - Drivers.
  - Bus assistants.
  - Scheduling.
- Students
  - Assignments.
  - Attendance.
  - Change requests.
- Safety and incidents
  - Incident reports.
  - Safety audits.
  - Violations.
  - Emergency management.
- Reports
  - Operational reports.
  - Financial reports.
  - Compliance reports.
  - Staff reports.
- Communication
  - Announcements.
  - Internal messaging.
  - Parent notifications.
- Audit logs.
- Settings.

### School Admin

- School Admin dashboard.
- Student dashboard data API.
- Student admission creation.
- Parent contact change workflow with audit history.
- Student withdrawal workflow.
- Student master-data update workflow.
- Permission to review all incident and complaint reports.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Axios
- CSS files colocated with dashboard components
- Vite dev-server proxy for `/api`

### Backend

- Node.js
- Express 5
- MySQL via `mysql2`
- JWT authentication via `jsonwebtoken`
- Password hashing via `bcrypt`
- Validation via `express-validator`
- Security headers via `helmet`
- CORS via `cors`
- Cookies via `cookie-parser`
- Request logging via `morgan`
- File upload parsing via `multer`
- S3-compatible storage support via `@aws-sdk/client-s3`

### Database

- MySQL
- InnoDB-style relational schema
- Foreign keys for key transport relationships
- Manual schema file rather than a full migration framework

## Repository Structure

```text
Soho/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example
│   ├── logs/
│   └── src/
│       ├── app.js
│       ├── config/
│       │   └── db.js
│       ├── controllers/
│       ├── middlewares/
│       ├── migration/
│       │   └── schema.sql
│       ├── routes/
│       ├── services/
│       ├── utils/
│       └── validators/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env.example
│   └── src/
│       ├── App.tsx
│       ├── contexts/
│       ├── lib/
│       └── components/
├── deploy/
│   ├── docker/
│   ├── nginx/
│   └── pm2/
├── docs/
│   ├── architecture/
│   ├── deployment/
│   └── postman/
├── docker-compose.yml
├── SECURITY.md
└── README.md
```

## Prerequisites

Install these before running the project locally:

- Node.js 18 or newer. Node 20+ is recommended.
- npm 9 or newer.
- MySQL 8 or compatible MySQL server.
- Git.
- Optional: Docker and Docker Compose.
- Optional: Postman for API exploration.

## Local Setup

Clone the repository and install dependencies separately for the backend and frontend.

```bash
git clone <repository-url>
cd Soho

cd backend
npm install

cd ../frontend
npm install
```

Create local environment files:

```bash
cd /path/to/Soho
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files for your local database credentials, ports, and API URLs.

## Environment Variables

### Backend: `backend/.env`

Example values:

```env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=Soho_Academy
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_ORIGIN=http://localhost:5173
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://pub-your-bucket-id.r2.dev
```

Backend variable notes:

- `PORT` controls the Express server port. If omitted, `server.js` defaults to `5000`.
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` configure MySQL.
- `JWT_SECRET` must be a strong secret in production.
- `JWT_EXPIRES_IN` controls access-token lifetime.
- `JWT_REFRESH_EXPIRES_IN` controls refresh-token lifetime.
- `FRONTEND_ORIGIN` must match the browser origin used by the frontend, such as `http://localhost:5173`.
- `R2_*` variables are used by upload middleware for Cloudflare R2/S3-compatible object storage.

### Frontend: `frontend/.env`

Example values:

```env
VITE_BACKEND_URL=http://localhost:5000
# Optional: use full backend URL instead of Vite proxy for API requests.
# VITE_API_BASE_URL=http://localhost:5000/api
# REACT_APP_API_URL=http://localhost:5000/api
```

Frontend variable notes:

- `VITE_BACKEND_URL` is used by `frontend/vite.config.ts` to proxy `/api` requests during local development.
- `VITE_API_BASE_URL` can point the frontend API client directly to a backend API root.
- Some older or component-local API code may also look for `VITE_API_URL`; if a screen cannot reach the backend, check the component's API base constant and align your `.env`.

## Database Setup

Create the database:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS Soho_Academy;"
```

Apply the schema:

```bash
mysql -u root -p Soho_Academy < backend/src/migration/schema.sql
```

The schema file is located at:

```text
backend/src/migration/schema.sql
```

Important database notes:

- The backend also contains some service-level `CREATE TABLE IF NOT EXISTS` guards. Those guards are useful during development, but the schema file should still be treated as the main database reference.
- The schema currently includes both early core tables and an expanded transport schema section. Review it carefully before applying to an existing production database.
- For production, use a proper migration workflow instead of repeatedly importing the full schema file.

### Minimum seed data

Drivers and Bus Assistants need active number plates for registration and assignment workflows.

Example seed:

```sql
INSERT INTO number_plates (plate_number, status)
VALUES
  ('KDA123A', 'active'),
  ('KDB456B', 'active'),
  ('KDC789C', 'inactive');
```

Routes and stops workflows also need route records. Routes can be created through the Transport Manager route planning UI or the `/api/routes` endpoint.

## Running the App

Run the backend:

```bash
cd backend
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Backend health check: `http://localhost:5000/health`

The Vite frontend proxies `/api` to the backend URL configured by `VITE_BACKEND_URL`.

## Common Development Commands

Backend:

```bash
cd backend
npm run dev      # start with nodemon
npm start        # start with node
npm test         # currently placeholder only
```

Frontend:

```bash
cd frontend
npm run dev      # start Vite dev server
npm run build    # TypeScript build plus Vite production build
npm run lint     # run ESLint
npm run preview  # preview production build locally
```

## Frontend Architecture

The frontend lives in `frontend/src`.

Important areas:

- `App.tsx`
  - Defines application routes and public/protected navigation.
- `contexts/AuthContext.tsx`
  - Owns frontend authentication state.
  - Stores and reads Soho auth values from local storage.
- `lib/api.ts`
  - Shared API client helpers and typed API modules.
- `components/Auth/`
  - Login and registration UI.
- `components/ProtectedRoute/`
  - Guards authenticated frontend routes.
- `components/Dashboard/`
  - Role-specific dashboards and nested dashboard tabs.

Dashboard component layout:

```text
frontend/src/components/Dashboard/
├── DriverDashboard/
├── BusAssistantDashboard/
├── ParentDashboard/
├── SchoolAdminDashboard/
└── TransportManagerDashboard/
```

Transport Manager tabs are subdivided by domain:

```text
TransportManagerDashboard/Tabs/
├── Dashboard/
├── Fleet/
├── Requests/
├── Routes/
├── Staff/
├── Students/
├── SafetyIncidents/
├── Reports/
├── Communication/
├── AuditLogs/
└── Settings/
```

Frontend API conventions:

- Prefer shared helpers in `frontend/src/lib/api.ts` for new work.
- Some older dashboard tabs define local Axios instances. When changing those areas, verify their API base URL and response shape.
- The backend tends to return camelCase API objects, while some UI components use snake_case internally. Normalize API data at the component/API boundary when needed.

## Backend Architecture

The backend lives in `backend/src`.

Request flow:

```text
HTTP request
  -> src/app.js
  -> route module
  -> authentication/authorization middleware
  -> validators
  -> controller
  -> service
  -> MySQL
  -> JSON response
```

Important backend folders:

- `config/`
  - Database configuration.
- `routes/`
  - Express route declarations and route-level middleware.
- `controllers/`
  - Request/response orchestration.
- `services/`
  - Database queries and business rules.
- `validators/`
  - `express-validator` request validation chains.
- `middlewares/`
  - Authentication, authorization, and upload middleware.
- `utils/`
  - Token and logging utilities.
- `migration/`
  - SQL schema.

Backend route mounting from `src/app.js`:

```text
/api/auth                  -> auth.routes.js
/api                       -> fleet.routes.js
/api/compliance-documents  -> complianceDocument.routes.js
/api/complaints            -> complaint.routes.js
/api/fuel-maintenance      -> fuelMaintenance.routes.js
/api/fuel-requests         -> fuelRequests.routes.js
/api/incidents             -> incident.routes.js
/api/parent                -> parent.routes.js
/api                       -> routes.routes.js
/api                       -> stops.routes.js
/api/students              -> student.routes.js
/api/users                 -> users.routes.js
```

Response envelope pattern:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

Validation error pattern:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format."
    }
  ]
}
```

## Authentication and Authorization

### Token model

- Access tokens are JWTs sent as `Authorization: Bearer <token>`.
- Refresh tokens are supported through the `/api/auth/refresh` endpoint and cookie handling.
- The frontend stores the access token under the Soho auth local-storage keys.

### Roles

Supported role names used throughout the codebase:

- `Parent`
- `Driver`
- `Bus Assistant`
- `Transport Manager`
- `School Admin`

### Backend authorization

The backend uses:

- `authenticate`
  - Verifies the bearer token.
- `authorizeRoles(...)`
  - Restricts endpoints to specific roles.

Examples:

- Student APIs are restricted to `School Admin`.
- Parent children APIs are restricted to `Parent`.
- Driver and Bus Assistant can create incident/complaint/request records.
- Transport Manager and School Admin can review/update some operational report statuses.

## API Reference

Base URL examples assume:

```text
http://localhost:5000
```

API routes are generally under:

```text
http://localhost:5000/api
```

### Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Check whether the backend process is alive. |

### Auth

Mounted at `/api/auth`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Register a user. |
| POST | `/api/auth/login` | No | Log in and receive auth tokens. |
| POST | `/api/auth/refresh` | Refresh token | Refresh session. |
| GET | `/api/auth/number-plates` | No | List active number plates for registration. |
| GET | `/api/auth/me` | Yes | Return authenticated user profile. |
| PATCH | `/api/auth/profile` | Yes | Update profile fields and optional profile photo. |
| POST | `/api/auth/logout` | No | Clear refresh cookie/logout. |

Registration example:

```json
{
  "email": "driver@example.com",
  "firstName": "Simon",
  "lastName": "Mwangi",
  "phoneNumber": "0712345678",
  "numberPlate": "KDA123A",
  "role": "Driver",
  "password": "secret123"
}
```

Login example:

```json
{
  "email": "driver@example.com",
  "password": "secret123"
}
```

### Fleet and Vehicles

Mounted at `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/number-plates` | List number plates. |
| GET | `/api/number-plates/active` | List active number plates. |
| POST | `/api/number-plates` | Create a number plate. |
| PATCH | `/api/number-plates/:id` | Update number plate status. |
| DELETE | `/api/number-plates/:id` | Delete/remove number plate. |
| GET | `/api/users/role/:role` | List users by role. |
| GET | `/api/vehicle-details` | List vehicle detail records. |
| GET | `/api/vehicle-details/:plateNumber` | Fetch vehicle details by plate. |
| GET | `/api/vehicles/:plateNumber` | Fetch vehicle details by plate alias. |
| PUT | `/api/vehicles/:plateNumber` | Update vehicle details. |

### Routes

Mounted at `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/routes` | List route records. |
| POST | `/api/routes` | Create a route. |
| PUT | `/api/routes/:id` | Update a route by numeric ID. |
| PATCH | `/api/routes/:id/status` | Update route status. |
| DELETE | `/api/routes/:id` | Delete a route. |

Route objects returned by the backend use camelCase fields such as `routeId` and `routeName`.

### Stops

Mounted at `/api`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/stops` | List stops with route information. |
| POST | `/api/stops` | Create a stop. |
| PUT | `/api/stops/:id` | Update a stop. |
| PATCH | `/api/stops/:id/sequence` | Update stop sequence order. |
| DELETE | `/api/stops/:id` | Soft-delete a stop. |

Stop create/update payloads can use either camelCase or snake_case fields for several properties. The service resolves public route codes such as `RT-001` to the internal route row ID.

### Fuel and Maintenance

Mounted at `/api/fuel-maintenance`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/fuel-maintenance/requests` | Driver, Bus Assistant, Transport Manager, School Admin | List requests. |
| GET | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Get one request. |
| POST | `/api/fuel-maintenance/requests` | Driver, Bus Assistant | Create request. |
| PUT | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Update request. |
| PATCH | `/api/fuel-maintenance/requests/:id/status` | Transport Manager, School Admin | Update request status. |
| DELETE | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Delete request. |

Mounted alias at `/api/fuel-requests`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/fuel-requests` | List fuel/maintenance requests. |
| GET | `/api/fuel-requests/status/:status` | List requests by status. |
| POST | `/api/fuel-requests` | Create request. |
| PATCH | `/api/fuel-requests/:id/status` | Update status. |

Fuel request example:

```json
{
  "requestDate": "2026-06-02",
  "requestTime": "08:30",
  "numberPlate": "KDA123A",
  "currentMileage": 143250,
  "requestType": "Fuel",
  "category": "Fuels & Oils",
  "description": "Refueling for morning route",
  "amount": 12000,
  "confirmedBy": "Erick"
}
```

### Incidents

Mounted at `/api/incidents`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/incidents/reports` | Driver, Bus Assistant | List own incident reports. |
| POST | `/api/incidents/reports` | Driver, Bus Assistant | Create incident report with optional images. |
| GET | `/api/incidents/all/reports` | Transport Manager, School Admin | List all incident reports. |
| PATCH | `/api/incidents/reports/:id/status` | Transport Manager, School Admin | Update incident status. |

### Complaints

Mounted at `/api/complaints`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/complaints/meta` | Driver, Bus Assistant | Fetch complaint form metadata. |
| GET | `/api/complaints/reports` | Driver, Bus Assistant | List own complaint reports. |
| POST | `/api/complaints/reports` | Driver, Bus Assistant | Create complaint report with optional attachment. |
| GET | `/api/complaints/all/reports` | Transport Manager, School Admin | List all complaint reports. |
| PATCH | `/api/complaints/reports/:id/status` | Transport Manager, School Admin | Update complaint status. |

### Compliance Documents

Mounted at `/api/compliance-documents`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/compliance-documents/documents` | Driver | List driver's uploaded compliance documents. |
| POST | `/api/compliance-documents/documents` | Driver | Upload a compliance document. |

### Students

Mounted at `/api/students`.

All student routes require `School Admin`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/students` | Fetch student dashboard data. |
| POST | `/api/students/admissions` | Admit a student. |
| PATCH | `/api/students/:studentId/parent-contact` | Update parent contact and record audit history. |
| PATCH | `/api/students/:studentId/withdrawal` | Mark a student as withdrawn. |
| PATCH | `/api/students/:studentId/master-data` | Update student master data. |

### Parent

Mounted at `/api/parent`.

All parent routes require `Parent`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/parent/children` | Fetch children for the authenticated parent. |

### Users

Mounted at `/api/users`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/users` | No route guard currently | List users, optionally filtered by query in service/controller behavior. |
| GET | `/api/users/me` | Yes | Return authenticated user profile. |

## Database Model

Primary tables in `backend/src/migration/schema.sql` include:

- `users`
  - Stores identity, role, contact, assigned number plate, password hash, and profile fields.
- `number_plates`
  - Stores vehicle plate inventory and active/inactive status.
- `vehicle_details`
  - Stores vehicle metadata associated with plates.
- `routes`
  - Stores route code, route name, status, vehicle assignment, driver/assistant assignment, route metrics, and soft-delete data.
- `stops`
  - Stores stop code, stop name, stop type, address, sequence order, status, and route relationship.
- `fuel_maintenance_requests`
  - Stores fuel, service, repair, maintenance, and compliance requests.
- `incident_reports`
  - Stores incidents/accidents submitted by Drivers and Bus Assistants.
- `uploads`
  - Stores uploaded file metadata.
- `incident_report_uploads`
  - Joins incident reports to upload records.
- `complaint_reports`
  - Stores complaints submitted by Drivers and Bus Assistants.
- `complaint_report_uploads`
  - Joins complaint reports to upload records.
- `compliance_documents`
  - Stores uploaded compliance document metadata.
- `students`
  - Stores student admission, status, parent contact, grade/stream, and withdrawal data.
- `student_parent_contact_changes`
  - Audit history for parent contact changes.
- `trip_monitoring`
  - Stores trip execution state and monitoring data.
- `trip_stops`
  - Stores per-stop trip timing and boarding/alighting data.
- `daily_schedule`
  - Stores route schedule records.
- `route_assignment_history`
  - Tracks route assignment changes over time.
- `student_route_assignment`
  - Links students to routes and stops.
- `route_optimization_logs`
  - Stores route optimization inputs/results and suggestions.

Relationship highlights:

- Routes reference vehicles, drivers, assistants, and creator users.
- Stops reference routes.
- Fuel/maintenance requests reference users and number plates.
- Incident and complaint uploads are represented through upload tables.
- Student contact changes reference students and the user who made the change.
- Route operations tables reference routes, stops, vehicles, drivers, assistants, and students.

## File Uploads

The backend includes upload middleware for:

- Profile photos.
- Incident images.
- Complaint attachments.
- Compliance documents.

Uploads are configured for R2/S3-compatible storage through the `R2_*` environment variables. If upload requests fail locally, check:

- R2 credentials exist in `backend/.env`.
- Bucket name is correct.
- Public base URL is configured.
- The uploaded file type and size satisfy the relevant middleware/validator.

## Logging

The backend uses `morgan` with log streams from `backend/src/utils/logger.js`.

Logs are written to:

```text
backend/logs/combined.log
backend/logs/error.log
```

Behavior:

- All requests go to the combined log.
- Requests with status code 400+ also go to the error log.
- API responses disable ETag caching and set no-store headers under `/api`.

## Postman Collection

Postman assets are included:

```text
docs/postman/Soho-Transport-API.postman_collection.json
docs/postman/Soho-Transport-Local.postman_environment.json
```

Recommended workflow:

1. Open Postman.
2. Import both files from `docs/postman`.
3. Select the `Soho Transport Local` environment.
4. Confirm `baseUrl` points to `http://localhost:5000`.
5. Run an auth login request first.
6. Use the returned token as `accessToken` for protected endpoints.

## Docker and Deployment

### Local frontend Docker

The root `docker-compose.yml` is frontend-focused.

```bash
docker compose up --build
```

The development frontend is available at:

```text
http://localhost:5173
```

Production frontend profile:

```bash
docker compose --profile prod up --build frontend-prod
```

Production frontend is available at:

```text
http://localhost:8080
```

### Full-stack production Docker

Production Docker assets live in:

```text
deploy/docker/
```

Quick start:

```bash
cd deploy/docker
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### PM2 and Nginx deployment

Deployment files:

```text
deploy/pm2/ecosystem.config.cjs
deploy/nginx/soho.conf
docs/deployment/DEPLOYMENT.md
```

High-level PM2/Nginx flow:

```bash
cd /var/www/soho/backend
npm ci --omit=dev
pm2 start /var/www/soho/deploy/pm2/ecosystem.config.cjs

cd /var/www/soho/frontend
npm ci
npm run build

sudo cp /var/www/soho/deploy/nginx/soho.conf /etc/nginx/sites-available/soho.conf
sudo ln -s /etc/nginx/sites-available/soho.conf /etc/nginx/sites-enabled/soho.conf
sudo nginx -t
sudo systemctl reload nginx
```

See the detailed deployment guide:

```text
docs/deployment/DEPLOYMENT.md
```

## Troubleshooting

### Backend fails to start

Check:

- MySQL is running.
- `backend/.env` exists.
- Database credentials are correct.
- `DB_NAME` exists.
- The schema has been imported.

You can test the database manually:

```bash
mysql -u your_mysql_user -p -e "SELECT 1;"
```

### Frontend cannot reach backend

Check:

- Backend is running on `http://localhost:5000` or your configured port.
- `frontend/.env` has `VITE_BACKEND_URL=http://localhost:5000`.
- The frontend dev server was restarted after editing `.env`.
- Backend `FRONTEND_ORIGIN` matches the frontend origin.

### CORS errors

Set this in `backend/.env`:

```env
FRONTEND_ORIGIN=http://localhost:5173
```

Restart the backend after changing it.

### Login succeeds but protected APIs fail

Check:

- The frontend has stored the access token.
- Requests include `Authorization: Bearer <token>`.
- The user role is allowed for the endpoint.
- The token has not expired.

### Driver or Bus Assistant registration fails

Check:

- The selected number plate exists in `number_plates`.
- The number plate status is `active`.
- The role string exactly matches `Driver` or `Bus Assistant`.

### Route select/dropdown shows blank options

The backend route API returns camelCase fields such as `routeId` and `routeName`. If a component expects `route_id` and `route_name`, normalize the response at the API boundary before rendering options.

### Stops cannot be created

Check:

- At least one route exists.
- The stop payload includes a valid public route code, such as `RT-001`.
- Sequence order is a positive integer.
- The route has not been deleted.

### Upload requests fail

Check:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, and `R2_PUBLIC_BASE_URL` are configured.
- The selected file type is allowed.
- The selected file is within the allowed size limit.
- The backend has network access to the object storage endpoint.

### Build warnings about large chunks

The frontend production build may warn that a JS chunk is larger than 500 kB. This is a Vite/Rollup warning, not necessarily a build failure. Consider route-level dynamic imports or manual chunking if bundle size becomes a real performance problem.

## Known Gaps and Maintenance Notes

- The backend test script is currently a placeholder and no automated test suite is configured.
- The database uses a schema file and service-level table guards rather than a formal migration framework.
- Some frontend modules use shared `frontend/src/lib/api.ts`; others still define local Axios instances.
- Some API responses are camelCase while older UI code may use snake_case. Normalize data at module boundaries.
- Some Transport Manager dashboard tabs are more complete than others. Verify API wiring before relying on a view operationally.
- Some fleet and route endpoints currently do not apply route-level auth guards. Add authorization before exposing production deployments broadly.
- `frontend/README.md` still contains Vite starter text; this root README is the main project guide.

## Security Notes

- Passwords are hashed with bcrypt.
- Helmet is enabled.
- CORS is configured from `FRONTEND_ORIGIN`.
- API responses under `/api` use no-store headers.
- Access tokens should be kept short-lived.
- Use strong production JWT secrets.
- Never commit real `.env` files or object-storage credentials.
- Review all unauthenticated route modules before production release.
- Keep upload validation strict for file type and size.
- Run production behind HTTPS.

## Additional Documentation

- Architecture notes: `docs/architecture/ARCHITECTURE.md`
- Deployment guide: `docs/deployment/DEPLOYMENT.md`
- Security policy: `SECURITY.md`
- Postman collection: `docs/postman/Soho-Transport-API.postman_collection.json`
- Postman environment: `docs/postman/Soho-Transport-Local.postman_environment.json`
