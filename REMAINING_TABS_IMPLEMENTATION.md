# Remaining Transport Manager Tabs Implementation Requirements

## Completed Tabs
✅ **Incident Reports** - Connected to `/api/incidents/all/reports` endpoint
✅ **Emergency Management** - Local state (needs backend endpoints)
✅ **Audit Logs** - Connected to new `/api/transport-manager/logs` endpoint

## Remaining Tabs & Requirements

### 1. Safety Audits Tab
**Status:** Not implemented
**Backend Requirements:**
- Database table: `safety_audits`
  - id, title, description, scheduled_date, conducted_date, auditor_id, status, findings, recommendations, created_at, updated_at
- Backend endpoint: `GET /api/transport-manager/safety-audits`
- Backend endpoint: `POST /api/transport-manager/safety-audits`
- Backend endpoint: `PATCH /api/transport-manager/safety-audits/:id`
- Backend endpoint: `DELETE /api/transport-manager/safety-audits/:id`

**Frontend Features:**
- List all safety audits
- Create new safety audit
- Update audit status (Scheduled, In Progress, Completed)
- Add findings and recommendations
- Assign auditor

### 2. Violations Tab
**Status:** Not implemented
**Backend Requirements:**
- Database table: `violations`
  - id, type, description, reported_by, reported_date, status, severity, action_taken, created_at, updated_at
- Backend endpoint: `GET /api/transport-manager/violations`
- Backend endpoint: `POST /api/transport-manager/violations`
- Backend endpoint: `PATCH /api/transport-manager/violations/:id`
- Backend endpoint: `DELETE /api/transport-manager/violations/:id`

**Frontend Features:**
- List all violations
- Create new violation report
- Update violation status
- Track actions taken
- Filter by severity

### 3. Reports Tab (4 sub-tabs)
**Status:** Not implemented
**Sub-tabs:**
- Operational Reports
- Financial Reports
- Compliance Reports
- Staff Reports

**Backend Requirements:**
- Reports can be generated from existing data:
  - Operational: trips, attendance, route performance (use existing trip_monitoring, student_attendance tables)
  - Financial: fuel costs, maintenance costs (use existing fuel_maintenance_requests, maintenance tables)
  - Compliance: document status, inspection status (use existing compliance_documents, audit_logs tables)
  - Staff: performance, attendance, incidents (use existing staff tables, incident_reports)

- Backend endpoints needed:
  - `GET /api/transport-manager/reports/operational`
  - `GET /api/transport-manager/reports/financial`
  - `GET /api/transport-manager/reports/compliance`
  - `GET /api/transport-manager/reports/staff`

**Frontend Features:**
- Date range selection
- Export to CSV/PDF
- Visual charts and graphs
- Summary statistics

### 4. Communication Tab (3 sub-tabs)
**Status:** Not implemented
**Sub-tabs:**
- Announcements
- Internal Messaging
- Parent Notifications

**Backend Requirements:**
- Database tables:
  - `announcements` - id, title, content, target_audience, created_by, created_at, published_at, status
  - `messages` - id, sender_id, receiver_id, subject, content, sent_at, read_at
  - `notifications` - id, recipient_id, type, title, message, sent_at, read_at

- Backend endpoints:
  - `GET /api/transport-manager/announcements`
  - `POST /api/transport-manager/announcements`
  - `PATCH /api/transport-manager/announcements/:id`
  - `DELETE /api/transport-manager/announcements/:id`
  - `GET /api/transport-manager/messages`
  - `POST /api/transport-manager/messages`
  - `GET /api/transport-manager/notifications`
  - `POST /api/transport-manager/notifications`

**Frontend Features:**
- Create and send announcements
- Internal messaging between staff
- Send notifications to parents
- Message history
- Read/unread status

### 5. Settings Tab
**Status:** Not implemented
**Backend Requirements:**
- Can use existing `users` table for user management
- May need `settings` table for system-wide settings
  - id, key, value, category, description, updated_at, updated_by

- Backend endpoints:
  - `GET /api/transport-manager/settings`
  - `PATCH /api/transport-manager/settings`
  - `GET /api/users` (for user management - already exists)
  - `PATCH /api/users/:id` (for user management - already exists)

**Frontend Features:**
- System configuration
- User management (view, edit roles, deactivate)
- Role permissions
- Organization settings
- School profile settings

## Implementation Priority

Based on backend-first approach:

1. **High Priority** (Can leverage existing data):
   - Reports Tab - Generate from existing tables (trips, attendance, fuel, incidents)
   - Settings Tab - User management already exists, just need settings table

2. **Medium Priority** (Need new tables but simple):
   - Safety Audits Tab - New table but straightforward CRUD
   - Violations Tab - New table but straightforward CRUD

3. **Low Priority** (Complex, multiple tables):
   - Communication Tab - Needs 3 new tables with relationships

## Recommendation

I recommend implementing in this order:
1. **Settings Tab** - User management already exists, just add settings table
2. **Reports Tab** - Generate from existing data, no new tables needed
3. **Safety Audits Tab** - Simple CRUD with one new table
4. **Violations Tab** - Simple CRUD with one new table
5. **Communication Tab** - Most complex, do last

Would you like me to continue with implementing these in the recommended order?
