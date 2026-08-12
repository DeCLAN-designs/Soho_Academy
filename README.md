# Soho Transport Management System

Soho is a role-based school transport management platform for coordinating vehicles, routes, drivers, bus assistants, students, parents, requests, incidents, compliance documents, and transport operations.

The repository contains a React + TypeScript frontend, an Express backend, and a MySQL database schema. The application is organized around dashboards for the main school transport roles:

- Parent
- Driver
- Bus Assistant
- Transport Manager
- School Admin

## Recent Development Work

This section documents all recent development work completed on the project.

### Transport Calendar Enhancements

The transport calendar has been significantly enhanced to use real backend data instead of frontend dummy data. This ensures all calendar data is persistent and manageable through the database.

**Changes Implemented:**

1. **Database Integration**
   - Academic years are now fetched from the backend via `/api/transport-manager/academic-years`
   - Academic terms are fetched from `/api/transport-manager/academic-terms`
   - Calendar events (holidays and special events) are fetched from `/api/transport-manager/calendar-events`
   - All calendar data is now stored in the database tables: `academic_years`, `academic_terms`, and `calendar_events`
   - Removed all hardcoded/dummy calendar data from the frontend

2. **Term Editing Functionality**
   - Added ability to edit academic terms through the transport calendar UI
   - Term details can be modified including start date, end date, and name
   - Changes are persisted to the database via API calls

3. **Holiday and Calendar Event Management**
   - Implemented edit functionality for holidays and calendar events
   - Implemented delete functionality for holidays and calendar events
   - Event details can be modified including date, description, and priority
   - Event deletions are confirmed and persisted to the database

4. **Transport Availability Configuration**
   - Added ability to configure whether transport services run on specific dates
   - Each calendar event has a transport availability setting
   - Transport managers can override default holiday restrictions

5. **Priority Event System**
   - Implemented priority event types: make-up days, exam days, and sports days
   - Priority events override standard holiday transport restrictions
   - Event priority is stored in the database and affects daily trip generation

6. **Date-Specific Transport Overrides**
   - Added ability to manually enable/disable transport for specific holiday dates
   - Provides flexibility for special circumstances when transport should run despite a holiday

7. **Date Formatting**
   - Backend dates (stored as `YYYY-MM-DD`) are now formatted for better readability in the UI
   - Display format uses user-friendly date presentation

8. **Transport Availability API**
   - Added endpoint: `GET /api/transport-manager/transport/availability/:date`
   - Allows checking transport availability for any specific date
   - Used by the calendar to determine if transport should operate

**Files Modified:**
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Routes/Tabs/TransportCalendar.tsx`
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Routes/Tabs/TransportCalendar.css`

### Route Planning Enhancements

The route planning module has been enhanced to use real backend data for staff assignments and vehicle details instead of mock data.

**Changes Implemented:**

1. **Staff Integration**
   - Removed dummy driver data and replaced with backend staff data
   - Drivers are now fetched from `/api/transport-manager/staff` endpoint
   - Bus assistants are fetched from the same endpoint with role filtering
   - Staff selection dropdowns now show real staff members from the database
   - Fixed staff endpoint from `/api/staff` to `/api/transport-manager/staff` to resolve 404 errors

2. **Vehicle Details Integration**
   - Enhanced vehicle display to show complete vehicle details
   - Vehicles now display: plate number, model, type, capacity, year, color, fuel type, status
   - Changed from simple number plate display to comprehensive vehicle information
   - Vehicle data is fetched from `/api/vehicle-details` endpoint

3. **Number Plate Display Fix**
   - Fixed undefined number plate display in the Assigned Vehicle selector
   - Added fallback values for vehicle fields in API response mapping
   - Normalized plate field handling between `plate_number` and `plateNumber` variations
   - Backend `listVehicleDetails` service updated to include `id` field in SELECT query

4. **Backend Vehicle Service Update**
   - Updated `backend/src/services/fleet.service.js` to include `id` in the vehicle details query
   - Ensures vehicle records have a unique identifier for proper mapping

**Files Modified:**
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Routes/Tabs/RoutePlanning.tsx`
- `backend/src/services/fleet.service.js`

### Vehicle Tab Simplification

The Fleet/Vehicle tab has been simplified to show vehicles from the backend as number plates only, removing assignment functionality to streamline the interface.

**Changes Implemented:**

1. **Backend Data Only**
   - Vehicle tab now exclusively displays vehicles from the backend database
   - Removed all mock/dummy vehicle data
   - Vehicles are fetched via `/api/number-plates` endpoint with proper authentication

2. **Number Plate Display**
   - Vehicles are displayed as number plates only (e.g., "KDA123A")
   - Simplified table showing: plate number, model, type, capacity, status
   - Removed driver, assistant, and route assignment columns

3. **Removed Assignment Features**
   - Removed staff assignment modal and functionality
   - Removed assignment buttons from action menus
   - Removed assignment-related state variables (drivers, assistants, assignDriver, assignAssistant)
   - Removed assignment-related handlers and API calls
   - Removed 'assign' from ModalType
   - Removed renderAssignModal function

4. **Cleaned Up Vehicle Interface**
   - Updated Vehicle interface to remove assignment fields (assignedDriver, assignedAssistant, assignedRoute)
   - Simplified vehicle data structure to focus on core vehicle information
   - Updated search functionality to remove driver and route search terms

5. **Authentication Fix**
   - Fixed 401 Unauthorized errors by using authenticated axiosInstance for API calls
   - Ensured proper Bearer token inclusion in all vehicle-related API requests
   - Removed dependency on centralized fleetApi due to import path issues

6. **CSS Cleanup**
   - Removed unused timeline styles (no longer needed after removing history modal)
   - Removed unused assignment styles (no longer needed after removing assignment modal)
   - Deduplicated modal size styles for better organization
   - Reduced CSS file from 874 lines to approximately 640 lines

**Files Modified:**
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Fleet/Tabs/Vehicles.tsx`
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Fleet/Tabs/Vehicles.css`

### Vehicle Route Assignments Database Table

Created the `vehicle_route_assignments` table to support flexible vehicle-to-route assignments with morning/evening period support.

**Changes Implemented:**

1. **Table Creation**
   - Created `vehicle_route_assignments` table with fields:
     - `id` (auto-increment primary key)
     - `vehicle_plate` (references number_plates)
     - `route_id` (references routes)
     - `time_period` (ENUM: 'Morning', 'Evening', 'Both')
     - `driver_user_id` (references users)
     - `assistant_user_id` (references users)
     - `effective_from` and `effective_to` (date range)
     - `status` (ENUM: 'Active', 'Inactive', 'Temporary')
     - `notes` (text field for special instructions)
     - Audit fields (created_at, updated_at, created_by_user_id)

2. **Assignment History Table**
   - Created `vehicle_route_assignment_history` table for audit trail
   - Tracks all assignment changes with old/new values
   - Records change type (created, updated, deleted, reactivated)
   - Stores change reason and who made the change

3. **Foreign Key Relationships**
   - Vehicle plate references number_plates table
   - Route references routes table
   - Driver and assistant reference users table
   - Proper CASCADE and RESTRICT rules for data integrity

4. **Indexes**
   - Added indexes on vehicle_plate, route_id, time_period, status, and effective dates
   - Unique constraint on vehicle_plate + route_id + time_period + effective_from

5. **Daily Trip Generation Support**
   - The table is used by the daily trip generation job
   - Queries active assignments for a given date
   - Filters by effective date range and status
   - Enables automated trip creation based on assignments

**Files Modified:**
- Database migration executed directly via Node.js script
- `backend/src/migration/schema_part8_vehicle_route_assignments.sql` (migration file reference)

### Fleet Submenu Update

The Fleet submenu label was changed from "Vehicles" to "Vehicle Details" to better reflect the comprehensive vehicle information available.

**Files Modified:**
- `frontend/src/components/Dashboard/TransportManagerDashboard/Tabs/Fleet/fleetSubTabs.ts`
- `frontend/src/components/Dashboard/TransportManagerDashboard/transportManagerDashboard.config.ts`

### TypeScript and Build Fixes

Fixed various TypeScript compilation and build issues throughout the project.

**Changes Implemented:**

1. **TypeScript Status Comparison Fix**
   - Fixed TS2367 error in vehicle status comparison
   - Changed from comparing with both 'Active' and 'active' to only 'Active'
   - Resolved type mismatch between title-case and lowercase status values

2. **Import Path Fixes**
   - Resolved import path issues for API modules
   - Fixed module resolution for centralized API functions
   - Added proper type annotations for interceptor parameters

**Files Modified:**
- Various TypeScript component files

### API Endpoint Corrections

Fixed API endpoint routing issues to ensure proper connectivity.

**Changes Implemented:**

1. **Staff Endpoint Correction**
   - Changed from `/api/staff` to `/api/transport-manager/staff`
   - Resolved 404 errors when fetching staff data
   - Properly routed through the transport-manager API prefix

2. **Authentication Headers**
   - Ensured all API calls include proper Bearer token authentication
   - Fixed 401 Unauthorized errors in vehicle-related endpoints
   - Used authenticated axiosInstance for all protected API calls

**Files Modified:**
- Route planning and vehicle components
- API service configurations

## Technical Implementation Details

### Transport Calendar Architecture

The transport calendar follows a three-tier architecture:

**Frontend Layer:**
- `TransportCalendar.tsx` - Main calendar component with month/year navigation
- Calendar grid view with event indicators
- Modal forms for creating/editing years, terms, and events
- Real-time filtering and availability checking

**API Layer:**
- Academic years endpoint: `/api/transport-manager/academic-years`
- Academic terms endpoint: `/api/transport-manager/academic-terms`
- Calendar events endpoint: `/api/transport-manager/calendar-events`
- Transport availability endpoint: `/api/transport-manager/transport/availability/:date`

**Database Layer:**
- `academic_years` table - Stores year definitions
- `academic_terms` table - Stores term definitions with year references
- `calendar_events` table - Stores events with priority and availability flags

**Data Flow:**
1. Frontend loads calendar data on component mount
2. User selects date range or creates new event
3. Frontend validates input and sends API request
4. Backend validates and persists to database
5. Frontend refreshes calendar view with updated data
6. Daily trip generation job reads calendar data for trip creation

### Route Planning Data Flow

**Vehicle Assignment Flow:**
1. Frontend fetches vehicles from `/api/vehicle-details`
2. Vehicles are filtered by 'Active' status
3. Vehicle options display plate number, model, type, and capacity
4. Selected vehicle plate is stored in form state
5. On submission, vehicle_plate is sent to backend route assignment API

**Staff Assignment Flow:**
1. Frontend fetches staff from `/api/transport-manager/staff`
2. Staff is filtered by role (Driver or Bus Assistant)
3. Staff options display full name
4. Selected staff IDs are stored in form state
5. On submission, driver_user_id and assistant_user_id are sent to backend

**Data Normalization:**
- Backend returns camelCase fields (plateNumber, firstName, lastName)
- Frontend normalizes field names for component use
- Fallback values handle missing or undefined fields
- Type safety maintained through TypeScript interfaces

### Vehicle Tab Data Architecture

**Simplified Data Model:**
```typescript
interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  type: VehicleType;
  year: number;
  capacity: number;
  color: string;
  fuelType: FuelType;
  status: VehicleStatus;
  lastService: string;
  mileage: number;
}
```

**API Integration:**
- Single source of truth: number_plates table
- Vehicle details fetched from `/api/number-plates`
- Authentication via Bearer token in axiosInstance
- Error handling with user-friendly messages

**Removed Complexity:**
- No staff assignment state management
- No assignment modal rendering
- No assignment history tracking
- Simplified component state (vehicles, loading, error only)

### Vehicle Route Assignment System

**Assignment Model:**
```typescript
interface VehicleRouteAssignment {
  id: number;
  vehicle_plate: string;
  route_id: number;
  time_period: 'Morning' | 'Evening' | 'Both';
  driver_user_id: number | null;
  assistant_user_id: number | null;
  effective_from: Date;
  effective_to: Date | null;
  status: 'Active' | 'Inactive' | 'Temporary';
  notes: string | null;
}
```

**Assignment Rules:**
- One vehicle can serve multiple routes in different time periods
- Same route can be served by different vehicles in morning vs evening
- Assignments have effective date ranges for seasonal changes
- Historical tracking via triggers on insert/update/delete

**Daily Trip Generation Integration:**
1. Cron job runs at 3:00 AM Nairobi time
2. Queries active assignments for current date
3. Checks transport calendar for availability
4. Creates trips for each active assignment
5. Seeds attendance records for created trips

## Database Schema Updates

### New Tables

**vehicle_route_assignments:**
```sql
CREATE TABLE vehicle_route_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_plate VARCHAR(20) NOT NULL,
  route_id INT NOT NULL,
  time_period ENUM('Morning', 'Evening', 'Both') NOT NULL DEFAULT 'Both',
  driver_user_id INT NULL,
  assistant_user_id INT NULL,
  effective_from DATE NOT NULL DEFAULT (CURDATE()),
  effective_to DATE NULL,
  status ENUM('Active', 'Inactive', 'Temporary') NOT NULL DEFAULT 'Active',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by_user_id INT NULL,
  -- Indexes and foreign keys
);
```

**vehicle_route_assignment_history:**
```sql
CREATE TABLE vehicle_route_assignment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  vehicle_plate VARCHAR(20) NOT NULL,
  route_id INT NOT NULL,
  time_period ENUM('Morning', 'Evening', 'Both') NOT NULL,
  change_type ENUM('created', 'updated', 'deleted', 'reactivated') NOT NULL,
  old_driver_id INT NULL,
  new_driver_id INT NULL,
  old_assistant_id INT NULL,
  new_assistant_id INT NULL,
  old_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NULL,
  old_effective_from DATE NULL,
  new_effective_from DATE NULL,
  old_effective_to DATE NULL,
  new_effective_to DATE NULL,
  change_reason TEXT NULL,
  changed_by_user_id INT NOT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Indexes and foreign keys
);
```

### Enhanced Tables

**number_plates:**
- Already existed, now properly integrated with vehicle details
- Status field ('active'/'inactive') used for filtering
- References vehicle_details for extended information

**vehicle_details:**
- Enhanced with `id` field for proper identification
- Now includes all vehicle metadata in single query
- Supports comprehensive vehicle display in UI

## Frontend Component Architecture

### Transport Calendar Component Structure

```
TransportCalendar/
├── TransportCalendar.tsx (Main component)
├── TransportCalendar.css (Styling)
└── Sub-components:
    ├── AcademicYearForm
    ├── AcademicTermForm
    ├── CalendarEventForm
    └── DateSelector
```

**State Management:**
- academicYears: Array of year objects
- academicTerms: Array of term objects
- calendarEvents: Array of event objects
- currentYear: Selected year state
- currentMonth: Selected month state
- modalType: Current modal (year/term/event)
- formData: Form data for current modal
- transportAvailability: Per-date availability cache

**Key Functions:**
- `fetchCalendarData()` - Loads all calendar data from backend
- `handleCreateYear()` - Creates new academic year
- `handleEditTerm()` - Updates existing term
- `handleDeleteEvent()` - Removes calendar event
- `checkTransportAvailability()` - Checks if transport runs on date
- `renderCalendarGrid()` - Renders month view with events

### Route Planning Component Structure

```
RoutePlanning/
├── RoutePlanning.tsx (Main component)
├── RoutePlanning.css (Styling)
└── Sub-components:
    ├── RouteForm
    ├── VehicleSelector
    ├── StaffSelector
    └── TimePeriodSelector
```

**State Management:**
- routes: Array of route objects
- vehicles: Array of vehicle objects
- drivers: Array of driver objects
- assistants: Array of assistant objects
- formData: Current route form data
- selectedRoute: Route being edited
- activeMenu: Action menu state

**Key Functions:**
- `loadRouteData()` - Loads routes, vehicles, and staff
- `handleVehicleChange()` - Updates selected vehicle
- `handleStaffChange()` - Updates driver/assistant assignments
- `saveRoute()` - Persists route assignment
- `filterActiveVehicles()` - Filters vehicles by status

### Vehicle Tab Component Structure

```
Vehicles/
├── Vehicles.tsx (Main component)
├── Vehicles.css (Styling)
└── Sub-components:
    ├── VehicleTable
    ├── VehicleForm (Registration/Edit)
    ├── VehicleStatusBadge
    └── VehicleModal
```

**State Management:**
- vehicles: Array of vehicle objects
- numberPlates: Array of plate objects
- loading: Loading state
- error: Error message
- searchTerm: Search filter
- typeFilter: Vehicle type filter
- statusFilter: Vehicle status filter
- modalType: Current modal type
- formData: Form data for registration/edit

**Key Functions:**
- `fetchAllData()` - Loads vehicles from backend
- `handleRegister()` - Creates new vehicle
- `handleEdit()` - Updates existing vehicle
- `handleDelete()` - Removes vehicle
- `handleStatusChange()` - Updates vehicle status

## API Response Formats

### Academic Years Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "2026-2027",
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "status": "Active"
    }
  ]
}
```

### Academic Terms Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "academicYearId": 1,
      "name": "Term 1",
      "startDate": "2026-01-15",
      "endDate": "2026-04-15",
      "status": "Active"
    }
  ]
}
```

### Calendar Events Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2026-08-15",
      "title": "Independence Day",
      "description": "National holiday",
      "eventType": "Holiday",
      "priority": "Standard",
      "transportAvailable": false
    }
  ]
}
```

### Vehicle Details Response
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "plateNumber": "KDA123A",
      "model": "Toyota Coaster",
      "type": "School Bus",
      "year": 2020,
      "capacity": 33,
      "color": "White",
      "fuelType": "Diesel",
      "status": "Active"
    }
  ]
}
```

### Staff Response
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com",
        "phoneNumber": "+254700000000",
        "role": "Driver",
        "status": "Active",
        "numberPlate": "KDA123A"
      }
    ]
  }
}
```

## Testing Guidelines

### Transport Calendar Testing

**Manual Testing Steps:**
1. Login as Transport Manager
2. Navigate to Routes → Transport Calendar
3. Verify academic years are displayed from database
4. Create a new academic year and verify it persists
5. Edit an existing term and verify changes are saved
6. Create a holiday event and verify it appears on calendar
7. Edit a holiday event and verify transport availability toggles
8. Delete a calendar event and verify it's removed
9. Check transport availability for various dates
10. Verify priority events override holiday restrictions

**Expected Results:**
- All calendar data loads from database
- CRUD operations persist correctly
- Date formatting is user-friendly
- Transport availability reflects configuration
- Priority events work as expected

### Route Planning Testing

**Manual Testing Steps:**
1. Login as Transport Manager
2. Navigate to Routes → Route Planning
3. Verify vehicles are loaded from backend
4. Verify drivers are loaded from backend
5. Verify assistants are loaded from backend
6. Create a new route assignment
7. Select a vehicle and verify plate number is displayed
8. Assign driver and assistant
9. Save the assignment
10. Verify assignment persists to database

**Expected Results:**
- All data comes from backend (no mock data)
- Vehicle plate numbers are displayed correctly
- Staff dropdowns show real staff members
- Assignments save successfully
- No 401 or 404 errors

### Vehicle Tab Testing

**Manual Testing Steps:**
1. Login as Transport Manager
2. Navigate to Fleet → Vehicle Details
3. Verify vehicles are loaded from backend
4. Verify only number plates and basic info are shown
5. Register a new vehicle
6. Edit an existing vehicle
7. Change vehicle status
8. Delete a vehicle
9. Search and filter vehicles

**Expected Results:**
- Vehicles load from backend database
- Display shows plate number, model, type, capacity, status
- No assignment features visible
- All CRUD operations work correctly
- No 401 authentication errors

## Deployment Considerations

### Database Migration Requirements

When deploying these changes to production:

1. **Run vehicle_route_assignments migration:**
   ```sql
   -- Execute the schema_part8_vehicle_route_assignments.sql
   -- This creates the assignment tables and triggers
   ```

2. **Verify existing data:**
   - Ensure number_plates table has active records
   - Ensure routes table has route records
   - Ensure users table has staff records

3. **Seed initial data if needed:**
   ```sql
   -- Example seed data
   INSERT INTO academic_years (name, start_date, end_date, status)
   VALUES ('2026-2027', '2026-01-01', '2026-12-31', 'Active');
   
   INSERT INTO calendar_events (date, title, description, event_type, priority, transport_available)
   VALUES ('2026-08-15', 'Independence Day', 'National holiday', 'Holiday', 'Standard', false);
   ```

### Environment Variables

Ensure these are set in production:

```env
# Backend
DB_HOST=production-db-host
DB_USER=production-db-user
DB_PASSWORD=production-db-password
DB_NAME=Soho_Academy
JWT_SECRET=strong-production-secret
FRONTEND_ORIGIN=https://your-domain.com

# Frontend
VITE_BACKEND_URL=https://your-api-domain.com
VITE_API_BASE_URL=https://your-api-domain.com/api
```

### Cron Job Configuration

The daily trip generation job requires:

1. **Node.js cron job setup:**
   - Job is configured in `backend/src/jobs/dailyTrips.job.js`
   - Runs at 3:00 AM Nairobi time
   - Requires vehicle_route_assignments table to exist

2. **Process manager (PM2):**
   ```javascript
   {
     "name": "soho-backend",
     "script": "server.js",
     "cron_restart": "0 3 * * *",
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

### Performance Considerations

1. **Calendar Data Loading:**
   - Calendar data should be cached when possible
   - Consider implementing pagination for large event lists
   - Optimize database queries with proper indexes

2. **Vehicle Data Loading:**
   - Vehicle details can be large - consider lazy loading
   - Implement pagination for large vehicle fleets
   - Cache vehicle details to reduce database queries

3. **Staff Data Loading:**
   - Staff lists are relatively small - can be loaded entirely
   - Consider role-based filtering to reduce data transfer

## Security Considerations

### Authentication

All new features require proper authentication:

- Transport calendar endpoints require Transport Manager role
- Route planning endpoints require Transport Manager role
- Vehicle management endpoints require Transport Manager role
- Ensure all API calls include Bearer token

### Authorization

Verify role-based access:

```javascript
// Example middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};
```

### Input Validation

All user inputs should be validated:

- Date format validation (YYYY-MM-DD)
- Plate number format validation
- Email format validation
- Role validation (must match allowed roles)
- Status validation (must match enum values)

### SQL Injection Prevention

Use parameterized queries:

```javascript
// Bad
const query = `SELECT * FROM vehicles WHERE plate = '${plate}'`;

// Good
const query = 'SELECT * FROM vehicles WHERE plate = ?';
await pool.query(query, [plate]);
```

## Troubleshooting New Features

### Transport Calendar Issues

**Problem:** Calendar events not displaying
- **Solution:** Check database has data in calendar_events table
- **Solution:** Verify API endpoint returns data
- **Solution:** Check browser console for JavaScript errors

**Problem:** Cannot edit terms
- **Solution:** Verify user has Transport Manager role
- **Solution:** Check academic_terms table exists
- **Solution:** Verify term ID is correct in API call

**Problem:** Transport availability not working
- **Solution:** Check transport availability API endpoint
- **Solution:** Verify calendar_events table has transport_available column
- **Solution:** Check daily trip generation job logs

### Route Planning Issues

**Problem:** Vehicles not loading
- **Solution:** Check vehicle_details table exists
- **Solution:** Verify API endpoint authentication
- **Solution:** Check browser network tab for 401 errors

**Problem:** Staff not loading
- **Solution:** Verify staff endpoint is `/api/transport-manager/staff`
- **Solution:** Check users table has staff records
- **Solution:** Verify role field matches 'Driver' or 'Bus Assistant'

**Problem:** Plate number showing as undefined
- **Solution:** Check API response field name (plateNumber vs plate_number)
- **Solution:** Verify normalization in frontend component
- **Solution:** Check vehicle details query includes plate_number field

### Vehicle Tab Issues

**Problem:** 401 Unauthorized errors
- **Solution:** Verify Bearer token is included in request headers
- **Solution:** Check axiosInstance interceptor is configured
- **Solution:** Verify user is logged in and token is valid

**Problem:** Vehicles not displaying
- **Solution:** Check number_plates table has records
- **Solution:** Verify API endpoint is `/api/number-plates`
- **Solution:** Check console for error messages

**Problem:** Cannot register vehicle
- **Solution:** Verify user has Transport Manager role
- **Solution:** Check plate number format is valid
- **Solution:** Verify number_plates table allows inserts

## Future Enhancements

### Potential Improvements

1. **Transport Calendar:**
   - Add recurrence patterns for regular events
   - Implement calendar export (iCal, CSV)
   - Add calendar import functionality
   - Implement calendar sharing between staff
   - Add email notifications for calendar changes

2. **Route Planning:**
   - Add route optimization algorithms
   - Implement map-based route visualization
   - Add real-time GPS tracking integration
   - Implement automatic route suggestions
   - Add route performance analytics

3. **Vehicle Management:**
   - Add vehicle maintenance scheduling
   - Implement fuel tracking integration
   - Add insurance expiration alerts
   - Implement vehicle inspection reminders
   - Add mileage tracking analytics

4. **Staff Management:**
   - Add staff availability calendar
   - Implement shift scheduling
   - Add staff performance metrics
   - Implement automated payroll integration
   - Add staff training tracking

## Contributing Guidelines

### Code Style

- Follow existing code patterns in each file
- Use TypeScript for all new components
- Add proper type definitions for interfaces
- Use descriptive variable and function names
- Add comments for complex logic

### API Development

- Use centralized API functions in `lib/api.ts` when possible
- Follow existing response envelope pattern
- Include proper error handling
- Add validation for all inputs
- Document new endpoints in README

### Database Changes

- Create migration files for schema changes
- Include foreign key constraints
- Add appropriate indexes
- Document table relationships
- Test migrations on development database first

### Testing

- Test all CRUD operations
- Verify authentication/authorization
- Test with realistic data volumes
- Check error handling
- Verify UI responsiveness

## Project Status

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
- Transport calendar with academic year, term, and event management.
- Vehicle route assignment system with period-based scheduling.
- Automated daily trip generation based on active vehicle-route assignments and transport calendar rules.

## Complete Feature Overview

### Cross-role features

- Login, registration, logout, and authenticated user profile lookup.
- Role-aware dashboard routing.
- Shared dashboard shell, sidebar navigation, and dashboard header.
- Protected frontend routes for authenticated areas.
- Bearer-token API requests from the frontend.
- HTTP-only refresh-token cookie support in the backend.
- Centralized error handling and user feedback.
- Responsive design for mobile and desktop.

### Parent

- Parent dashboard area.
- API to fetch children linked to the authenticated parent.
- View child transport assignments and route information.
- View child attendance records.
- Submit transport change requests.
- View transport request status.
- Receive notifications about transport changes.

### Driver

- Driver dashboard.
- Attendance screen with boarding/alighting tracking.
- Fuel and maintenance request workflow.
- Incident and accident reporting with photo uploads.
- Complaints and reports submission.
- Compliance document uploads (insurance, license, PSV, etc.).
- Profile screen with profile update support.
- Assigned number plate enforcement for driver-submitted operational requests.
- View daily trip assignments.
- View route information and stop details.

### Bus Assistant

- Bus Assistant dashboard.
- Attendance screen with student tracking.
- Accident/report workflow.
- Complaint/incident workflow.
- Profile screen.
- Shared operational request permissions with Driver where applicable.
- View assigned route and vehicle information.
- Student safety monitoring features.

### Transport Manager

Transport Manager has the broadest dashboard surface. Major areas include:

- Fleet
  - Vehicle inventory and vehicle details
  - Number plate management (create, update, delete, status change)
  - Fuel management (requests, approvals, tracking)
  - Maintenance views (scheduled, emergency, history)
  - Vehicle document views (compliance documents)
  - Vehicle status tracking (Active, Maintenance, Inactive)
  - Mileage tracking and reporting
- Requests
  - Fuel requests (review, approve, reject)
  - Maintenance requests (review, approve, reject)
  - Route requests (change requests from drivers)
  - Student requests (change requests from parents)
  - Request workflow management
- Routes
  - Route planning (create, edit, delete routes)
  - Stops management (add, reorder, remove stops)
  - Route monitoring (view active routes, status)
  - Route optimization (view suggestions, apply changes)
  - **Transport Calendar**
    - Academic year and term management
    - Holiday and calendar event management
    - Transport availability configuration
    - Priority event overrides (make-up, exam, sports)
    - Date-specific transport overrides
    - Event type categorization
    - Calendar event CRUD operations
- Staff
  - Drivers (view all, assign to routes, manage availability)
  - Bus assistants (view all, assign to routes, manage availability)
  - Scheduling (view schedules, manage shifts)
  - Staff performance tracking
- Students
  - Assignments (assign to routes, view current assignments)
  - Attendance (view daily attendance, track patterns)
  - Change requests (review parent requests, approve/reject)
  - Student information management
- Safety and incidents
  - Incident reports (view all, investigate, close)
  - Safety audits (schedule, conduct, report)
  - Violations (track, report, manage)
  - Emergency management (protocols, contacts, procedures)
- Reports
  - Operational reports (trips, attendance, route performance)
  - Financial reports (fuel costs, maintenance costs, revenue)
  - Compliance reports (document status, inspection status)
  - Staff reports (performance, attendance, incidents)
- Communication
  - Announcements (send to parents, staff, all)
  - Internal messaging (staff communication)
  - Parent notifications (automated, manual)
  - Notification templates and scheduling
- Audit logs
  - View all system changes
  - Filter by user, action, date range
  - Export audit reports
- Settings
  - System configuration
  - User management
  - Role permissions
  - Organization settings
- Automated daily trip generation based on active vehicle-route assignments and transport calendar rules

### School Admin

- School Admin dashboard.
- Student dashboard data API (comprehensive student information).
- Student admission creation (new student registration).
- Parent contact change workflow with audit history.
- Student withdrawal workflow (reason tracking, date recording).
- Student master-data update workflow (name, grade, stream changes).
- Permission to review all incident and complaint reports.
- View and manage all user accounts.
- System-wide settings and configuration.
- Academic year and term management.
- School calendar management.

## Tech Stack

### Frontend

- **React 19** - Latest React with concurrent features, automatic batching, and improved performance
- **TypeScript 5.x** - Static typing for better code quality and developer experience
- **Vite 5.x** - Fast build tool with HMR, optimized production builds, and modern module handling
- **React Router 6.x** - Client-side routing with lazy loading, nested routes, and route guards
- **Axios 1.x** - HTTP client with interceptors, request/response transformation, and error handling
- **CSS Modules** - Scoped CSS files colocated with dashboard components for maintainability
- **Vite dev-server proxy** - Development proxy for `/api` requests to backend
- **React Context API** - State management for authentication and global state
- **Custom Hooks** - Reusable logic for data fetching, forms, and performance monitoring
- **Performance Optimization** - Code splitting, lazy loading, and LCP optimization

### Backend

- **Node.js 20.x** - Latest LTS version with improved performance and security
- **Express 5.x** - Web framework with middleware support, routing, and error handling
- **MySQL 8.x via mysql2/promise** - Promise-based MySQL driver with prepared statements and connection pooling
- **JWT authentication via jsonwebtoken** - Secure token-based authentication with access and refresh tokens
- **Password hashing via bcrypt** - Secure password hashing with salt rounds
- **Validation via express-validator** - Request validation with sanitization and custom validators
- **Security headers via helmet** - HTTP security headers for protection against common vulnerabilities
- **CORS via cors** - Cross-Origin Resource Sharing configuration
- **Cookies via cookie-parser** - Cookie parsing for HTTP-only refresh tokens
- **Request logging via morgan** - HTTP request logger with custom log streams
- **File upload parsing via multer** - Multipart form data handling for file uploads
- **S3-compatible storage via @aws-sdk/client-s3** - Cloudflare R2 integration for file storage
- **Node-cron** - Scheduled task execution for daily trip generation
- **Event Publishing** - Domain event system for audit logging and notifications
- **Async/Await** - Modern async patterns throughout codebase

### Database

- **MySQL 8.x** - Relational database with JSON support, window functions, and CTEs
- **InnoDB engine** - ACID compliance, foreign keys, and row-level locking
- **Foreign key constraints** - Referential integrity with CASCADE and RESTRICT rules
- **Indexes** - Optimized indexes for frequently queried columns
- **Manual schema file** - SQL schema file in `backend/src/migration/schema.sql`
- **Part-based migrations** - Schema split into parts for incremental updates
- **Connection pooling** - Efficient database connection management
- **Timezone support** - Database timezone configuration for accurate date handling

### Development Tools

- **nodemon** - Auto-restart development server on file changes
- **ESLint** - JavaScript/TypeScript linting with custom rules
- **Prettier** - Code formatting (if configured)
- **Git** - Version control
- **Postman** - API testing and documentation
- **Docker** - Containerization for deployment
- **Docker Compose** - Multi-container orchestration
- **PM2** - Process manager for production deployments
- **Nginx** - Reverse proxy and static file serving

### DevOps & Infrastructure

- **Cloudflare R2** - S3-compatible object storage for file uploads
- **GitHub** - Code repository (if hosted)
- **CI/CD** - Continuous integration/deployment (if configured)
- **SSL/TLS** - HTTPS encryption for production
- **Load Balancing** - For high availability (if configured)
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

Complete project structure with all important directories and files:

```text
Soho/
├── backend/                              # Express REST API server
│   ├── package.json                      # Backend dependencies and scripts
│   ├── server.js                         # Application entry point
│   ├── .env.example                      # Environment variables template
│   ├── .env                             # Actual environment variables (gitignored)
│   ├── logs/                             # Application logs
│   │   ├── combined.log                  # All HTTP requests
│   │   └── error.log                     # Error requests (4xx, 5xx)
│   └── src/                              # Source code
│       ├── app.js                        # Express app configuration and route mounting
│       ├── config/                       # Configuration files
│       │   └── db.js                    # MySQL connection pool configuration
│       ├── controllers/                 # Request/response handlers
│       │   ├── auth.controller.js       # Authentication endpoints
│       │   ├── complianceDocument.controller.js
│       │   ├── complaint.controller.js
│       │   ├── fleet.controller.js      # Fleet and vehicle management
│       │   ├── fuelMaintenance.controller.js
│       │   ├── incident.controller.js
│       │   ├── parent.controller.js      # Parent-specific endpoints
│       │   ├── routes.controller.js     # Route management
│       │   ├── staff.controller.js      # Staff management
│       │   ├── stops.controller.js      # Stop management
│       │   ├── student.controller.js    # Student lifecycle
│       │   ├── trips.controller.js      # Trip management
│       │   └── users.controller.js      # User management
│       ├── middlewares/                  # Express middleware
│       │   ├── authenticate.js           # JWT verification
│       │   ├── authorize.js              # Role-based authorization
│       │   ├── errorHandler.js          # Global error handler
│       │   ├── upload.js                 # Multer file upload configuration
│       │   └── validators.js            # Request validation chains
│       ├── migration/                    # Database schema files
│       │   ├── schema.sql                # Main database schema
│       │   ├── schema_part2_routes_stops.sql
│       │   ├── schema_part3_users_number_plates.sql
│       │   ├── schema_part4_incidents_complaints.sql
│       │   ├── schema_part5_compliance_uploads.sql
│       │   ├── schema_part6_students.sql
│       │   ├── schema_part7_transport_calendar.sql
│       │   ├── schema_part8_vehicle_route_assignments.sql
│       │   └── schema_part9_academic_years_terms.sql
│       ├── routes/                       # Express route definitions
│       │   ├── auth.routes.js            # Authentication routes
│       │   ├── complianceDocument.routes.js
│       │   ├── complaint.routes.js
│       │   ├── fleet.routes.js           # Fleet and vehicle routes
│       │   ├── fuelMaintenance.routes.js
│       │   ├── incident.routes.js
│       │   ├── parent.routes.js
│       │   ├── routes.routes.js
│       │   ├── staff.routes.js
│       │   ├── stops.routes.js
│       │   ├── student.routes.js
│       │   ├── trips.routes.js
│       │   ├── users.routes.js
│       │   └── vehicleRouteAssignment.routes.js
│       ├── services/                     # Business logic and database queries
│       │   ├── auth.service.js          # Authentication logic
│       │   ├── complianceDocument.service.js
│       │   ├── complaint.service.js
│       │   ├── fleet.service.js         # Fleet and vehicle business logic
│       │   ├── fuelMaintenance.service.js
│       │   ├── incident.service.js
│       │   ├── parent.service.js
│       │   ├── routes.service.js
│       │   ├── staff.service.js
│       │   ├── stops.service.js
│       │   ├── student.service.js
│       │   ├── trips.service.js
│       │   ├── users.service.js
│       │   └── vehicleRouteAssignment.service.js
│       ├── jobs/                         # Scheduled tasks
│       │   └── dailyTrips.job.js        # Daily trip generation cron job
│       ├── utils/                        # Utility functions
│       │   ├── eventPublisher.js         # Domain event publishing
│       │   ├── auditLogger.js            # Audit logging
│       │   ├── logger.js                 # Morgan logger configuration
│       │   └── tokenUtils.js             # JWT token utilities
│       └── validators/                   # Request validation schemas
│           ├── auth.validator.js
│           ├── fleet.validator.js
│           ├── routes.validator.js
│           └── student.validator.js
├── frontend/                             # React TypeScript SPA
│   ├── package.json                      # Frontend dependencies and scripts
│   ├── vite.config.ts                    # Vite configuration
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── tsconfig.app.json                 # App-specific TypeScript config
│   ├── tsconfig.node.json                # Node-specific TypeScript config
│   ├── .env.example                      # Environment variables template
│   ├── .env                             # Actual environment variables (gitignored)
│   ├── index.html                       # HTML entry point
│   └── src/                              # Source code
│       ├── main.tsx                      # Application entry point
│       ├── App.tsx                       # React Router configuration
│       ├── vite-env.d.ts                 # Vite environment variable types
│       ├── contexts/                     # React Context providers
│       │   └── AuthContext.tsx          # Authentication state management
│       ├── lib/                          # Shared utilities and API client
│       │   └── api.ts                    # Centralized API functions and types
│       ├── components/                   # React components
│       │   ├── Auth/                     # Authentication components
│       │   │   ├── Login.tsx
│       │   │   ├── Register.tsx
│       │   │   └── ProtectedRoute.tsx
│       │   ├── Dashboard/               # Dashboard components
│       │   │   ├── DashboardHeader.tsx   # Shared dashboard header
│       │   │   ├── DashboardSidebar.tsx  # Shared sidebar navigation
│       │   │   ├── BusAssistantDashboard/
│       │   │   │   ├── BusAssistantDashboard.tsx
│       │   │   │   └── Tabs/
│       │   │   ├── DriverDashboard/
│       │   │   │   ├── DriverDashboard.tsx
│       │   │   │   └── Tabs/
│       │   │   ├── ParentDashboard/
│       │   │   │   ├── ParentDashboard.tsx
│       │   │   │   └── Tabs/
│       │   │   ├── SchoolAdminDashboard/
│       │   │   │   ├── SchoolAdminDashboard.tsx
│       │   │   │   └── Tabs/
│       │   │   └── TransportManagerDashboard/
│       │   │       ├── TransportManagerDashboard.tsx
│       │   │       ├── transportManagerDashboard.config.ts
│       │   │       └── Tabs/
│       │   │           ├── Dashboard/
│       │   │           ├── Fleet/
│       │   │           │   ├── FleetTab.tsx
│       │   │           │   └── Tabs/
│       │   │           │       ├── Vehicles.tsx
│       │   │           │       ├── Vehicles.css
│       │   │           │       ├── FuelManagement.tsx
│       │   │           │       ├── Maintenance.tsx
│       │   │           │       └── Documents.tsx
│       │   │           ├── Requests/
│       │   │           ├── RequestsTab.tsx
│       │   │           └── Tabs/
│       │   │           ├── Routes/
│       │   │           ├── RoutesTab.tsx
│       │   │           └── Tabs/
│       │   │               ├── RoutePlanning.tsx
│       │   │               ├── RoutePlanning.css
│       │   │               ├── StopsManagement.tsx
│       │   │               ├── RouteMonitoring.tsx
│       │   │               ├── RouteOptimization.tsx
│       │   │               └── TransportCalendar.tsx
│       │   │                   └── TransportCalendar.css
│       │   │           ├── Staff/
│       │   │           ├── StaffTab.tsx
│       │   │           └── Tabs/
│       │   │           ├── Students/
│       │   │           ├── StudentsTab.tsx
│       │   │           └── Tabs/
│       │   │           ├── SafetyIncidents/
│       │   │           ├── Reports/
│       │   │           ├── Communication/
│       │   │           ├── AuditLogs/
│       │   │           └── Settings/
│       │   ├── Common/                    # Shared UI components
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Table.tsx
│       │   │   └── Card.tsx
│       │   └── Performance/              # Performance optimization components
│       │       ├── AsyncComponent.tsx
│       │       ├── LayoutStabilizer.tsx
│       │       └── LCPOptimizer.tsx
│       ├── assets/                      # Static assets
│       │   ├── images/
│       │   └── fonts/
│       └── styles/                      # Global styles
│           ├── global.css
│           └── variables.css
├── deploy/                               # Deployment configurations
│   ├── docker/                           # Docker configurations
│   │   ├── docker-compose.yml
│   │   └── docker-compose.prod.yml
│   ├── nginx/                            # Nginx configuration
│   │   └── soho.conf
│   └── pm2/                              # PM2 process manager
│       └── ecosystem.config.cjs
├── docs/                                 # Documentation
│   ├── architecture/
│   │   └── ARCHITECTURE.md               # System architecture documentation
│   ├── deployment/
│   │   └── DEPLOYMENT.md                 # Deployment guide
│   └── postman/                          # Postman collections
│       ├── Soho-Transport-API.postman_collection.json
│       └── Soho-Transport-Local.postman_environment.json
├── docker-compose.yml                    # Root Docker Compose for development
├── SECURITY.md                           # Security policy and guidelines
├── .gitignore                             # Git ignore rules
├── README.md                              # This file
└── LICENSE                                # License file (if present)
```

### Key File Descriptions

**Backend Entry Points:**
- `server.js` - Main server entry point, starts Express server
- `src/app.js` - Express app configuration, middleware setup, route mounting

**Frontend Entry Points:**
- `src/main.tsx` - React application bootstrap
- `src/App.tsx` - React Router configuration and route definitions

**Configuration Files:**
- `backend/.env` - Backend environment variables (DB credentials, JWT secrets, etc.)
- `frontend/.env` - Frontend environment variables (API URLs, etc.)
- `frontend/vite.config.ts` - Vite build tool configuration
- `frontend/tsconfig.json` - TypeScript compiler configuration

**Database:**
- `backend/src/migration/schema.sql` - Main database schema
- `backend/src/migration/schema_part*.sql` - Incremental schema updates

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
### Configure environment files
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files for your local database credentials, ports, and API URLs.

## Environment Variables

### Backend: `backend/.env`

Complete list of all configurable environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=Soho_Academy
DB_TIMEZONE=+03:00

# JWT Authentication
JWT_SECRET=replace_with_a_secure_random_string_at_least_32_characters
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=replace_with_another_secure_random_string
JWT_REFRESH_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:5173

# Cloudflare R2 / S3-Compatible Storage (for file uploads)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://pub-your-bucket-id.r2.dev

# Application Timezone
APP_TIMEZONE=Africa/Nairobi
```

**Detailed variable descriptions:**

- `PORT` - Express server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production/test)
- `DB_HOST` - MySQL server hostname or IP address
- `DB_USER` - MySQL username with database access
- `DB_PASSWORD` - MySQL user password
- `DB_NAME` - MySQL database name
- `DB_TIMEZONE` - Database timezone for date operations
- `JWT_SECRET` - Secret key for signing JWT access tokens (must be strong and random)
- `JWT_EXPIRES_IN` - Access token lifetime (e.g., 8h, 24h, 7d)
- `JWT_REFRESH_SECRET` - Secret key for signing refresh tokens
- `JWT_REFRESH_EXPIRES_IN` - Refresh token lifetime (e.g., 7d, 30d)
- `FRONTEND_ORIGIN` - Frontend URL for CORS (must match browser origin exactly)
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_NAME` - R2 bucket name for file storage
- `R2_PUBLIC_BASE_URL` - Public URL for accessing uploaded files
- `APP_TIMEZONE` - Application timezone for cron jobs and date calculations

**Security Notes:**
- Never commit `.env` files to version control
- Use strong, randomly generated secrets for JWT keys
- Use different secrets for access and refresh tokens
- Rotate secrets periodically in production
- Use environment-specific configurations

### Frontend: `frontend/.env`

Complete list of all configurable environment variables:

```env
# Backend API Configuration
VITE_BACKEND_URL=http://localhost:5000
VITE_API_BASE_URL=http://localhost:5000/api

# Optional: Direct API URL (bypasses Vite proxy)
# VITE_API_BASE_URL=http://localhost:5000/api

# Application Configuration
VITE_APP_NAME=Soho Transport Management
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_MODE=false
```

**Detailed variable descriptions:**

- `VITE_BACKEND_URL` - Backend base URL used by Vite proxy for `/api` requests
- `VITE_API_BASE_URL` - Direct API base URL (if bypassing Vite proxy)
- `VITE_APP_NAME` - Application name for display
- `VITE_APP_VERSION` - Application version
- `VITE_ENABLE_PERFORMANCE_MONITORING` - Enable performance monitoring tools
- `VITE_ENABLE_DEBUG_MODE` - Enable debug logging and features

**Variable Precedence:**
1. `VITE_API_BASE_URL` (if set) - Used directly by API client
2. `VITE_BACKEND_URL` - Used by Vite proxy configuration
3. Default fallback - `/api` (proxied to localhost:5000)

**Environment-Specific Configurations:**

**Development (.env.development):**
```env
VITE_BACKEND_URL=http://localhost:5000
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_MODE=true
```

**Production (.env.production):**
```env
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_ENABLE_PERFORMANCE_MONITORING=false
VITE_ENABLE_DEBUG_MODE=false
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
# Optional: use full backend URL instead of Vite proxy for API requests.
# Optional: use full backend URL instead of Vite proxy.
# VITE_API_BASE_URL=http://localhost:5000/api
# REACT_APP_API_URL=http://localhost:5000/api
```

Frontend variable notes:

- `VITE_BACKEND_URL` is used by `frontend/vite.config.ts` to proxy `/api` requests during local development.
- `VITE_API_BASE_URL` can point the frontend API client directly to a backend API root.
- Some older or component-local API code may also look for `VITE_API_URL`; if a screen cannot reach the backend, check the component's API base constant and align your `.env`.

## Database Setup

### Complete Database Setup Process

#### Step 1: Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**macOS (with Homebrew):**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
- Download MySQL Installer from https://dev.mysql.com/downloads/mysql/
- Run installer and follow setup wizard
- Set root password during installation

#### Step 2: Create Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE IF NOT EXISTS Soho_Academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create database user (optional, for better security)
CREATE USER IF NOT EXISTS 'soho_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON Soho_Academy.* TO 'soho_user'@'localhost';
FLUSH PRIVILEGES;

# Exit MySQL
EXIT;
```

#### Step 3: Apply Schema Files

The database schema is split into multiple parts for incremental updates. Apply them in order:

```bash
# Navigate to backend directory
cd /path/to/Soho/backend

# Apply main schema
mysql -u root -p Soho_Academy < src/migration/schema.sql

# Apply part 2: Routes and Stops
mysql -u root -p Soho_Academy < src/migration/schema_part2_routes_stops.sql

# Apply part 3: Users and Number Plates
mysql -u root -p Soho_Academy < src/migration/schema_part3_users_number_plates.sql

# Apply part 4: Incidents and Complaints
mysql -u root -p Soho_Academy < src/migration/schema_part4_incidents_complaints.sql

# Apply part 5: Compliance and Uploads
mysql -u root -p Soho_Academy < src/migration/schema_part5_compliance_uploads.sql

# Apply part 6: Students
mysql -u root -p Soho_Academy < src/migration/schema_part6_students.sql

# Apply part 7: Transport Calendar
mysql -u root -p Soho_Academy < src/migration/schema_part7_transport_calendar.sql

# Apply part 8: Vehicle Route Assignments
mysql -u root -p Soho_Academy < src/migration/schema_part8_vehicle_route_assignments.sql

# Apply part 9: Academic Years and Terms
mysql -u root -p Soho_Academy < src/migration/schema_part9_academic_years_terms.sql
```

#### Step 4: Verify Database Setup

```bash
# Login to MySQL
mysql -u root -p Soho_Academy

# List all tables
SHOW TABLES;

# Verify key tables exist
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM number_plates;
SELECT COUNT(*) FROM routes;
SELECT COUNT(*) FROM stops;
SELECT COUNT(*) FROM vehicle_route_assignments;
SELECT COUNT(*) FROM academic_years;
SELECT COUNT(*) FROM calendar_events;

# Exit MySQL
EXIT;
```

#### Step 5: Seed Initial Data

**Seed Number Plates (required for Driver/Bus Assistant registration):**
```sql
INSERT INTO number_plates (plate_number, status, created_at, updated_at)
VALUES
  ('PLATE-001', 'active', NOW(), NOW()),
  ('PLATE-002', 'active', NOW(), NOW()),
  ('PLATE-003', 'active', NOW(), NOW()),
  ('PLATE-004', 'inactive', NOW(), NOW()),
  ('PLATE-005', 'active', NOW(), NOW());
```

**Seed Routes (required for stop management):**
```sql
INSERT INTO routes (route_id, route_name, description, status, created_at, updated_at)
VALUES
  ('RT-001', 'Route 1', 'Morning and evening routes', 'Active', NOW(), NOW()),
  ('RT-002', 'Route 2', 'Morning and evening routes', 'Active', NOW(), NOW()),
  ('RT-003', 'Route 3', 'Morning and evening routes', 'Active', NOW(), NOW());
```

**Seed Academic Year (required for transport calendar):**
```sql
INSERT INTO academic_years (name, start_date, end_date, status, created_at, updated_at)
VALUES
  ('2026-2027', '2026-01-01', '2026-12-31', 'Active', NOW(), NOW());
```

**Seed Academic Terms:**
```sql
INSERT INTO academic_terms (academic_year_id, name, start_date, end_date, status, created_at, updated_at)
VALUES
  (1, 'Term 1', '2026-01-15', '2026-04-15', 'Active', NOW(), NOW()),
  (1, 'Term 2', '2026-05-01', '2026-08-15', 'Active', NOW(), NOW()),
  (1, 'Term 3', '2026-09-01', '2026-12-15', 'Active', NOW(), NOW());
```

**Seed Calendar Events:**
```sql
INSERT INTO calendar_events (date, title, description, event_type, priority, transport_available, created_at, updated_at)
VALUES
  ('2026-08-15', 'Independence Day', 'National holiday - schools closed', 'Holiday', 'Standard', false, NOW(), NOW()),
  ('2026-12-25', 'Christmas Day', 'Christmas holiday - schools closed', 'Holiday', 'Standard', false, NOW(), NOW()),
  ('2026-12-26', 'Boxing Day', 'Boxing Day holiday - schools closed', 'Holiday', 'Standard', false, NOW(), NOW());
```

#### Step 6: Configure Backend Environment

Update `backend/.env` with your database credentials:

```env
DB_HOST=localhost
DB_USER=your_mysql_user  # or 'soho_user' if you created one
DB_PASSWORD=your_mysql_password
DB_NAME=Soho_Academy
DB_TIMEZONE=+03:00
```

#### Step 7: Test Database Connection

Start the backend server and verify it connects to the database:

```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to MySQL
🚀 Server running on http://localhost:5000
```

If you see connection errors, verify:
- MySQL server is running
- Database credentials in `.env` are correct
- Database exists and is accessible
- User has proper privileges

### Database Schema Overview

**Core Tables:**

1. **users** - User accounts with authentication and profile data
2. **number_plates** - Vehicle registration and status
3. **vehicle_details** - Extended vehicle information
4. **routes** - Route definitions and assignments
5. **stops** - Route stops with sequence and location
6. **vehicle_route_assignments** - Vehicle-to-route assignments with periods
7. **vehicle_route_assignment_history** - Assignment change tracking
8. **academic_years** - Academic year definitions
9. **academic_terms** - Term definitions within years
10. **calendar_events** - Holidays and special events

**Operational Tables:**

11. **fuel_maintenance_requests** - Fuel and maintenance requests
12. **incident_reports** - Incident/accident reports
13. **complaint_reports** - Complaint submissions
14. **compliance_documents** - Compliance document uploads
15. **uploads** - File upload metadata
16. **students** - Student records
17. **student_parent_contact_changes** - Parent contact change audit
18. **student_route_assignment** - Student-to-route assignments
19. **trip_monitoring** - Trip execution tracking
20. **trip_stops** - Per-stop trip data

**Audit and Tracking Tables:**

21. **route_assignment_history** - Route assignment changes
22. **vehicle_route_assignment_history** - Vehicle assignment changes
23. **audit_logs** - System-wide audit trail

### Database Backup and Restore

**Backup:**
```bash
# Backup entire database
mysqldump -u root -p Soho_Academy > backup_$(date +%Y%m%d).sql

# Backup specific tables
mysqldump -u root -p Soho_Academy users number_plates routes > core_backup.sql
```

**Restore:**
```bash
# Restore from backup
mysql -u root -p Soho_Academy < backup_20240101.sql
```

**Automated Backup (Cron):**
```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * mysqldump -u root -pYOUR_PASSWORD Soho_Academy > /backups/soho_$(date +\%Y\%m\%d).sql
```

## Running the App

### Complete Startup Instructions

#### Step 1: Start MySQL Service

**Linux/Ubuntu:**
```bash
sudo systemctl start mysql
sudo systemctl status mysql
```

**macOS:**
```bash
brew services start mysql
```

**Windows:**
- Start MySQL service from Services
- Or use MySQL Workbench to start server

#### Step 2: Start Backend Server

Open terminal and navigate to backend directory:

```bash
cd /path/to/Soho/backend

# Install dependencies (first time only)
npm install

# Start development server with auto-reload
npm run dev
```

**Expected output:**
```
[nodemon] 3.0.1
[nodemon] to watch: src/
[nodemon] starting `node server.js`
✅ Connected to MySQL
✅ Scheduled dailyTrips cron job (3:00 AM every day)
🚀 Server running on http://localhost:5000
📝 Express logs: terminal + /path/to/Soho/backend/logs/combined.log
📝 Express error logs: /path/to/Soho/backend/logs/error.log
```

**Backend endpoints:**
- API: `http://localhost:5000/api`
- Health check: `http://localhost:5000/health`

#### Step 3: Start Frontend Development Server

Open new terminal and navigate to frontend directory:

```bash
cd /path/to/Soho/frontend

# Install dependencies (first time only)
npm install

# Start Vite dev server
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Frontend URL:**
- Development: `http://localhost:5173`
- API requests proxied to backend at `http://localhost:5000`

#### Step 4: Access the Application

1. Open browser and navigate to `http://localhost:5173`
2. You should see the login page
3. Register a new user or login with existing credentials
4. Based on your role, you'll be redirected to the appropriate dashboard

**Default Test Accounts (if seeded):**

**School Admin:**
- Email: admin@soho.academy
- Password: [Set during initial setup]

**Transport Manager:**
- Email: transport@soho.academy
- Password: [Set during initial setup]

**Driver:**
- Email: driver@soho.academy
- Password: [Set during initial setup]
- Requires number plate: KDA123A

**Bus Assistant:**
- Email: assistant@soho.academy
- Password: [Set during initial setup]
- Requires number plate: KDB456B

**Parent:**
- Email: parent@soho.academy
- Password: [Set during initial setup]

### Running in Production Mode

#### Backend Production:

```bash
cd backend

# Build for production (if you have build steps)
npm run build

# Start with Node.js directly
NODE_ENV=production node server.js

# Or use PM2 process manager
pm2 start server.js --name soho-backend
```

#### Frontend Production:

```bash
cd frontend

# Build for production
npm run build

# Preview production build locally
npm run preview

# Or serve with Nginx (see deployment section)
```

### Monitoring Logs

**Backend logs location:**
```bash
cd backend/logs

# View all requests
tail -f combined.log

# View errors only
tail -f error.log

# View last 100 lines
tail -n 100 combined.log
```

**Frontend logs:**
- Frontend logs appear in browser console
- Vite logs appear in terminal where `npm run dev` is running

### Default Local URLs

- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:5000`
- **Backend API:** `http://localhost:5000/api`
- **Health Check:** `http://localhost:5000/health`

### Vite Proxy Configuration

The frontend Vite config proxies `/api` requests to the backend:

```typescript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: backendUrl,  // http://localhost:5000
      changeOrigin: true,
    },
  },
}
```

This means:
- Frontend calls `/api/vehicles` → Proxied to `http://localhost:5000/api/vehicles`
- No CORS issues in development
- Backend CORS configuration still needed for production

## Common Development Commands

### Backend Commands

```bash
cd backend

# Development
npm run dev              # Start with nodemon (auto-restart on file changes)
npm start               # Start with node (no auto-restart)
npm test                # Run tests (currently placeholder)

# Database Operations
# Manual database operations
mysql -u root -p Soho_Academy < src/migration/schema.sql
mysql -u root -p Soho_Academy < src/migration/schema_part2_routes_stops.sql
mysql -u root -p Soho_Academy < src/migration/schema_part3_users_number_plates.sql
mysql -u root -p Soho_Academy < src/migration/schema_part4_incidents_complaints.sql
mysql -u root -p Soho_Academy < src/migration/schema_part5_compliance_uploads.sql
mysql -u root -p Soho_Academy < src/migration/schema_part6_students.sql
mysql -u root -p Soho_Academy < src/migration/schema_part7_transport_calendar.sql
mysql -u root -p Soho_Academy < src/migration/schema_part8_vehicle_route_assignments.sql
mysql -u root -p Soho_Academy < src/migration/schema_part9_academic_years_terms.sql

# Check database connection
node -e "const pool = require('./src/config/db.js'); pool.query('SELECT 1').then(() => console.log('✅ DB OK')).catch(console.error).finally(() => pool.end());"

# View logs
tail -f logs/combined.log    # View all request logs
tail -f logs/error.log       # View error logs only
tail -n 100 logs/combined.log # View last 100 lines

# PM2 (production)
pm2 start server.js --name soho-backend
pm2 stop soho-backend
pm2 restart soho-backend
pm2 logs soho-backend
pm2 delete soho-backend
```

### Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # TypeScript check + Vite production build
npm run preview          # Preview production build locally (http://localhost:4173)
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically

# Type Checking
npx tsc --noEmit        # TypeScript type check without emitting files
npx tsc --pretty         # TypeScript type check with pretty output

# Testing (if configured)
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report

# Dependencies
npm install              # Install all dependencies
npm install package-name # Install specific package
npm install package-name --save-dev # Install as dev dependency
npm update               # Update all dependencies
npm outdated             # Check for outdated packages
npm audit                # Check for security vulnerabilities
npm audit fix            # Fix security vulnerabilities

# Build Analysis
npm run build -- --mode development  # Build for development
npm run build -- --mode production   # Build for production
npx vite-bundle-visualizer           # Visualize bundle size
```

### Git Commands

```bash
# From repository root

# Status and changes
git status              # Show working tree status
git diff                # Show unstaged changes
git diff --staged      # Show staged changes
git log --oneline       # Show commit history

# Branching
git branch              # List branches
git branch feature-name  # Create new branch
git checkout feature-name # Switch to branch
git checkout -b feature-name # Create and switch to branch
git merge feature-name   # Merge branch into current

# Staging and committing
git add .               # Stage all changes
git add file.tsx        # Stage specific file
git commit -m "message" # Commit staged changes
git commit -am "message" # Stage and commit all changes

# Undoing changes
git checkout -- file.tsx    # Discard local changes to file
git reset HEAD file.tsx      # Unstage file
git reset --soft HEAD~1      # Undo last commit, keep changes
git reset --hard HEAD~1      # Undo last commit, discard changes

# Remote operations
git remote -v          # Show remote repositories
git push origin main    # Push to remote
git pull origin main    # Pull from remote
git fetch origin       # Fetch changes without merging
```

### Docker Commands

```bash
# From repository root

# Development
docker compose up              # Start all services
docker compose up --build     # Rebuild and start
docker compose down            # Stop all services
docker compose down -v         # Stop and remove volumes

# Production profile
docker compose --profile prod up --build
docker compose --profile prod down

# View logs
docker compose logs backend   # View backend logs
docker compose logs frontend  # View frontend logs
docker compose logs -f         # Follow logs

# Individual services
docker compose up backend     # Start only backend
docker compose up frontend    # Start only frontend
docker compose restart backend
docker compose stop backend
```

### Database Commands

```bash
# MySQL operations
mysql -u root -p                    # Login to MySQL
mysql -u root -p Soho_Academy      # Login to specific database
mysql -u root -p -e "SHOW DATABASES;"  # List databases
mysql -u root -p -e "SHOW TABLES;"    # List tables in current DB

# Export/Import
mysqldump -u root -p Soho_Academy > backup.sql  # Export database
mysql -u root -p Soho_Academy < backup.sql   # Import database

# Query operations
mysql -u root -p Soho_Academy -e "SELECT * FROM users LIMIT 10;"
mysql -u root -p Soho_Academy -e "SELECT COUNT(*) FROM vehicles;"
```

## Docker
### Development
From the repository root:
```bash
cd frontend
npm run dev      # start Vite dev server
npm run build    # TypeScript build plus Vite production build
npm run lint     # run ESLint
npm run preview  # preview production build locally
```
- The `frontend` service is available at `http://localhost:5173`

## Frontend Architecture

The frontend lives in `frontend/src` and follows a component-based architecture with TypeScript for type safety.

### Component Structure

**Main Application Components:**

- `App.tsx` - Root component defining all application routes and navigation
- `main.tsx` - Application bootstrap and initialization
- `index.html` - HTML entry point with root div for React mounting

**Authentication Flow:**

- `contexts/AuthContext.tsx` - Central authentication state management
  - Stores user object, token, and authentication status
  - Provides login, logout, and token refresh functions
  - Persists auth state to localStorage
  - Provides auth context to all child components

- `components/Auth/` - Authentication UI components
  - `Login.tsx` - Login form with email/password
  - `Register.tsx` - Registration form with user details
  - `ProtectedRoute.tsx` - Route guard for authenticated pages

**Shared UI Components:**

- `components/Dashboard/DashboardHeader.tsx` - Header with user info and actions
- `components/Dashboard/DashboardSidebar.tsx` - Navigation sidebar with role-based menu
- `components/ProtectedRoute/` - Route protection wrapper

**Dashboard Components:**

The dashboard is organized by role, each with its own sub-folder:

```
components/Dashboard/
├── DriverDashboard/          # Driver-specific features
│   ├── DriverDashboard.tsx
│   └── Tabs/
│       ├── Attendance.tsx
│       ├── FuelMaintenance.tsx
│       ├── Incidents.tsx
│       ├── Complaints.tsx
│       ├── Compliance.tsx
│       └── Profile.tsx
├── BusAssistantDashboard/    # Bus Assistant features
│   ├── BusAssistantDashboard.tsx
│   └── Tabs/
│       ├── Attendance.tsx
│       ├── Incidents.tsx
│       ├── Complaints.tsx
│       └── Profile.tsx
├── ParentDashboard/          # Parent features
│   ├── ParentDashboard.tsx
│   └── Tabs/
│       ├── Children.tsx
│       ├── Transport.tsx
│       ├── Requests.tsx
│       └── Profile.tsx
├── SchoolAdminDashboard/    # School Admin features
│   ├── SchoolAdminDashboard.tsx
│   └── Tabs/
│       ├── Students.tsx
│       ├── Admissions.tsx
│       ├── Withdrawals.tsx
│       ├── Incidents.tsx
│       └── Complaints.tsx
└── TransportManagerDashboard/ # Transport Manager features
    ├── TransportManagerDashboard.tsx
    ├── transportManagerDashboard.config.ts
    └── Tabs/
        ├── Dashboard/
        ├── Fleet/
        │   ├── FleetTab.tsx
        │   └── Tabs/
        │       ├── Vehicles.tsx
        │       ├── Vehicles.css
        │       ├── FuelManagement.tsx
        │       ├── Maintenance.tsx
        │       └── Documents.tsx
        ├── Requests/
        │   ├── RequestsTab.tsx
        │   └── Tabs/
        ├── Routes/
        │   ├── RoutesTab.tsx
        │   └── Tabs/
        │       ├── RoutePlanning.tsx
        │       ├── RoutePlanning.css
        │       ├── StopsManagement.tsx
        │       ├── RouteMonitoring.tsx
        │       ├── RouteOptimization.tsx
        │       └── TransportCalendar.tsx
        │           └── TransportCalendar.css
        ├── Staff/
        │   ├── StaffTab.tsx
        │   └── Tabs/
        ├── Students/
        │   ├── StudentsTab.tsx
        │   └── Tabs/
        ├── SafetyIncidents/
        ├── Reports/
        ├── Communication/
        ├── AuditLogs/
        └── Settings/
```

### API Client Architecture

**Centralized API Layer (`lib/api.ts`):**

The API client provides a unified interface for all backend communication:

**Features:**
- Automatic token inclusion from localStorage
- Request/response interceptors
- Error handling with automatic token refresh
- Type-safe API functions with TypeScript
- Centralized error handling and user feedback
- Retry logic for network errors
- Timeout handling (30 seconds)

**API Modules:**

```typescript
// Auth module
authApi.login(payload)
authApi.register(payload)
authApi.refresh()
authApi.logout()
authApi.me()

// Fleet module
fleetApi.getNumberPlates()
fleetApi.getActiveNumberPlates()
fleetApi.getVehicleDetails()

// Route module
routeApi.getRoutes()
routeApi.createRoute(payload)
routeApi.updateRoute(id, payload)
routeApi.deleteRoute(id)

// And more...
```

**Request Flow:**

1. Component calls API function (e.g., `authApi.login()`)
2. API function builds request with headers
3. Request intercepted to add Bearer token
4. Request sent to backend
5. Response intercepted for error handling
6. On 401, attempt token refresh
7. On success, return typed response
8. On error, redirect to login or show error message

### State Management Patterns

**Local State (useState):**
- Component-specific state (form inputs, modals, UI state)
- Simple derived state (filtered lists, computed values)
- Temporary UI state (loading, error, active menu)

**Context State (useContext):**
- Authentication state (user, token, isAuthenticated)
- Global application state (if added in future)

**Server State (API calls):**
- Data fetched from backend
- Stored in component state
- Refreshed on user actions or component mount

### Performance Optimization

**Code Splitting:**
- Route-based code splitting via React.lazy()
- Component lazy loading for large dashboards
- Dynamic imports for non-critical features

**Image Optimization:**
- Lazy loading for images
- WebP format support where available
- Responsive image loading

**Bundle Optimization:**
- Manual chunk splitting in Vite config
- Vendor chunking for libraries
- CSS code splitting
- Tree shaking for unused code

**Monitoring:**
- LCP (Largest Contentful Paint) tracking
- CLS (Cumulative Layout Shift) monitoring
- TBT (Total Blocking Time) measurement
- Custom performance hooks

### CSS Architecture

**Scoped CSS:**
- Each component has its own CSS file
- CSS files co-located with components
- No global CSS pollution
- Component-specific class naming (prefix-based)

**CSS Variables:**
- Defined in component CSS files
- Theme colors, spacing, typography
- Easy theming and maintenance

**CSS Conventions:**
- BEM-like naming: `.component__element--modifier`
- Prefix-based: `.vp-` for Vehicles page
- Responsive design with media queries
- Mobile-first approach

### TypeScript Configuration

**Type Safety:**
- Strict mode enabled
- No implicit any
- Null checks enabled
- Unused variables checked

**Path Aliases (vite.config.ts):**
```typescript
'@': resolve(__dirname, 'src'),
'@components': resolve(__dirname, 'src/components'),
'@contexts': resolve(__dirname, 'src/contexts'),
'@lib': resolve(__dirname, 'src/lib'),
'@assets': resolve(__dirname, 'src/assets'),
```

**Type Definitions:**
- Shared types in `lib/api.ts`
- Component-specific types in component files
- API response types for all endpoints
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

The backend lives in `backend/src` and follows a layered architecture with Express.js.

### Request Flow

```
HTTP Request
  ↓
Express App (app.js)
  ↓
Route Module (routes/*.js)
  ↓
Authentication Middleware (authenticate.js)
  ↓
Authorization Middleware (authorize.js)
  ↓
Request Validators (validators/*.js)
  ↓
Controller (controllers/*.js)
  ↓
Service Layer (services/*.js)
  ↓
MySQL Database (via mysql2/promise)
  ↓
JSON Response
  ↓
Response Interceptors
  ↓
HTTP Response
```

### Directory Structure and Responsibilities

**Configuration Layer (`config/`):**
- `db.js` - MySQL connection pool configuration
  - Connection pooling (max 10 connections)
  - Timeout configuration
  - Timezone settings
  - Environment variable integration

**Routes Layer (`routes/`):**
- `auth.routes.js` - Authentication endpoints (login, register, refresh, logout)
- `fleet.routes.js` - Fleet management (number plates, vehicle details)
- `complianceDocument.routes.js` - Compliance document uploads
- `complaint.routes.js` - Complaint submission and management
- `fuelMaintenance.routes.js` - Fuel and maintenance requests
- `incident.routes.js` - Incident reporting
- `parent.routes.js` - Parent-specific endpoints
- `routes.routes.js` - Route management
- `staff.routes.js` - Staff management
- `stops.routes.js` - Stop management
- `student.routes.js` - Student lifecycle
- `trips.routes.js` - Trip management
- `users.routes.js` - User management
- `vehicleRouteAssignment.routes.js` - Vehicle-route assignments

**Controllers Layer (`controllers/`):**
Controllers handle HTTP request/response orchestration:
- Parse request body and parameters
- Call appropriate service methods
- Handle errors and format responses
- Apply business rules before calling services
- Format response envelopes

**Services Layer (`services/`):**
Services contain business logic and database operations:
- Database queries via connection pool
- Data transformation and validation
- Business rule enforcement
- Transaction management
- Event publishing for audit logs

**Middlewares Layer (`middlewares/`):**
- `authenticate.js` - JWT token verification
  - Extracts Bearer token from Authorization header
  - Verifies token signature and expiration
  - Attaches user object to request
  - Returns 401 if invalid

- `authorize.js` - Role-based authorization
  - Checks if user role is in allowed list
  - Returns 403 if unauthorized
  - Supports multiple roles

- `errorHandler.js` - Global error handling
  - Catches all errors
  - Logs errors appropriately
  - Returns user-friendly error messages
  - Distinguishes between client and server errors

- `upload.js` - File upload configuration
  - Multer configuration for multipart/form-data
  - File type validation
  - File size limits
  - Storage destination (local or cloud)

- `validators.js` - Request validation chains
  - Express-validator configurations
  - Field validation rules
  - Custom validators
  - Sanitization

**Utils Layer (`utils/`):**
- `eventPublisher.js` - Domain event publishing
  - Publish events for audit logging
  - Event formatting
  - Event history tracking

- `auditLogger.js` - Audit logging
  - Log all data changes
  - Track who made changes
  - Store change history

- `logger.js` - Morgan logger configuration
  - Log stream setup
  - Log formatting
  - Log file rotation

- `tokenUtils.js` - JWT token utilities
  - Token generation
  - Token verification
  - Token refresh logic

**Jobs Layer (`jobs/`):**
- `dailyTrips.job.js` - Scheduled task for daily trip generation
  - Runs at 3:00 AM Nairobi time
  - Checks transport calendar
  - Queries active vehicle-route assignments
  - Generates trips for each assignment
  - Seeds attendance records

**Migration Layer (`migration/`):**
- Database schema files
- Incremental schema updates
- Table creation scripts
- Index definitions
- Foreign key constraints

### Route Mounting from `src/app.js`

Routes are mounted under `/api` with specific prefixes:

```javascript
/api/auth                    → auth.routes.js (authentication)
/api/                        → fleet.routes.js (fleet management)
/api/compliance-documents  → complianceDocument.routes.js
/api/complaints            → complaint.routes.js
/api/fuel-maintenance      → fuelMaintenance.routes.js
/api/incidents             → incident.routes.js
/api/parent                → parent.routes.js
/api/                        → routes.routes.js (route management)
/api/                        → stops.routes.js (stop management)
/api/students              → student.routes.js
/api/users                 → users.routes.js
/api/transport-manager     → transport-manager routes (staff, calendar, etc.)
```

### Response Patterns

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {
    // Response data specific to endpoint
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format."
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters."
    }
  ]
}
```

**Generic Error Response:**
```json
{
  "success": false,
  "message": "An error occurred.",
  "error": "Internal server error details"
}
```

### Authentication Flow

**Login Process:**
1. User submits email and password to `/api/auth/login`
2. Controller receives credentials
3. Service hashes password and queries database
4. If valid, generate access token (short-lived)
5. Generate refresh token (long-lived)
6. Set refresh token in HTTP-only cookie
7. Return access token in response body
8. Frontend stores access token in localStorage

**Token Refresh Process:**
1. Access token expires or is about to expire
2. Frontend calls `/api/auth/refresh`
3. Backend verifies refresh token from cookie
4. If valid, generate new access token
5. Return new access token
6. Frontend updates stored access token

**Protected Request Process:**
1. Frontend includes Bearer token in Authorization header
2. Request passes through authenticate middleware
3. Middleware verifies token signature and expiration
4. User object attached to request
5. Request continues to controller
6. If token invalid, return 401 Unauthorized

### Error Handling Strategy

**Error Types:**
- ValidationError (400) - Invalid input data
- AuthenticationError (401) - Invalid or missing token
- AuthorizationError (403) - Valid token but insufficient permissions
- NotFoundError (404) - Resource not found
- ConflictError (409) - Resource conflict (duplicate, etc.)
- InternalServerError (500) - Server error

**Error Handling Flow:**
1. Error caught in try-catch block
2. Error logged to error log file
3. Appropriate HTTP status code set
4. User-friendly error message returned
5. Sensitive details excluded from response

**Logging Strategy:**
- All requests logged to `logs/combined.log`
- Errors (4xx, 5xx) logged to `logs/error.log`
- Log format: timestamp, method, URL, status, response time
- Sensitive data (passwords, tokens) excluded from logs

## Authentication and Authorization

### Authentication System

The application uses JWT (JSON Web Tokens) for stateless authentication with refresh token support.

**Token Types:**

1. **Access Token:**
   - Short-lived (default: 8 hours)
   - Sent in Authorization header: `Bearer <token>`
   - Contains user ID, role, and expiration
   - Used for all authenticated API requests

2. **Refresh Token:**
   - Long-lived (default: 7 days)
   - Stored in HTTP-only cookie
   - Used to obtain new access tokens
   - Secure against XSS attacks

**Token Payload Structure:**
```json
{
  "userId": 123,
  "email": "user@example.com",
  "role": "Transport Manager",
  "firstName": "John",
  "lastName": "Doe",
  "iat": 1234567890,
  "exp": 1234601490
}
```

**Authentication Endpoints:**

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear tokens
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/profile` - Update user profile

**Registration Process:**
1. User submits registration form with:
   - Email
   - First name
   - Last name
   - Phone number
   - Password
   - Role (Parent, Driver, Bus Assistant)
   - Number plate (for Driver/Bus Assistant)
   - Parent ID type and number (for Parent)

2. Backend validates input
3. Password is hashed with bcrypt (10 salt rounds)
4. User record created in database
5. Access and refresh tokens generated
6. Refresh token set in HTTP-only cookie
7. Access token returned in response

**Login Process:**
1. User submits email and password
2. Backend finds user by email
3. Password hash compared with database
4. If valid, tokens generated
5. Refresh token set in cookie
6. Access token returned

**Token Refresh Process:**
1. Access token expires (401 response)
2. Frontend calls `/api/auth/refresh`
3. Backend validates refresh token from cookie
4. New access token generated
5. New access token returned
6. Refresh token rotated (optional security measure)

**Logout Process:**
1. Frontend calls `/api/auth/logout`
2. Backend clears refresh token cookie
3. Frontend clears access token from localStorage
4. User redirected to login page

### Authorization System

**Role-Based Access Control (RBAC):**

The application uses role-based authorization to restrict access to specific endpoints and features.

**Supported Roles:**

1. **Parent** - Can view children, transport assignments, and attendance
2. **Driver** - Can manage trips, submit requests, report incidents
3. **Bus Assistant** - Can manage attendance, report incidents
4. **Transport Manager** - Full access to transport operations
5. **School Admin** - Can manage students, review all reports

**Authorization Middleware:**

The `authorizeRoles` middleware restricts endpoints to specific roles:

```javascript
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }
    next();
  };
};
```

**Role Permissions Matrix:**

| Feature | Parent | Driver | Bus Assistant | Transport Manager | School Admin |
|--------|--------|--------|---------------|-------------------|---------------|
| View Children | ✅ | ❌ | ❌ | ❌ | ✅ |
| Transport Calendar | ❌ | ❌ | ❌ | ✅ | ✅ |
| Route Planning | ❌ | ❌ | ❌ | ✅ | ❌ |
| Vehicle Management | ❌ | ❌ | ❌ | ✅ | ❌ |
| Staff Management | ❌ | ❌ | ❌ | ✅ | ❌ |
| Student Management | ❌ | ❌ | ❌ | ❌ | ✅ |
| Submit Incident | ❌ | ✅ | ✅ | ✅ | ✅ |
| Submit Complaint | ❌ | ✅ | ✅ | ✅ | ✅ |
| View All Incidents | ❌ | ❌ | ❌ | ✅ | ✅ |
| Fuel Requests | ❌ | ✅ | ✅ | ✅ | ✅ |
| Compliance Docs | ❌ | ✅ | ❌ | ✅ | ✅ |

**Protected Routes:**

Frontend routes are protected using `ProtectedRoute` component:

```typescript
<ProtectedRoute>
  <TransportManagerDashboard />
</ProtectedRoute>
```

This component:
- Checks if user is authenticated
- Redirects to login if not authenticated
- Optionally checks user role
- Redirects to appropriate dashboard if role mismatch

### Security Best Practices

**Token Security:**
- Use strong random secrets for JWT signing
- Use short access token lifetime (8 hours or less)
- Use HTTP-only cookies for refresh tokens
- Implement token rotation on refresh
- Invalidate tokens on password change
- Store secrets in environment variables

**Password Security:**
- Hash passwords with bcrypt (10+ salt rounds)
- Never store plain text passwords
- Enforce strong password requirements
- Implement rate limiting on login attempts
- Allow password reset functionality

**Session Security:**
- Use HTTPS in production
- Implement CSRF protection (if using session cookies)
- Set appropriate cookie flags (Secure, HttpOnly, SameSite)
- Implement session timeout
- Invalidate sessions on logout

**API Security:**
- Validate all input data
- Sanitize user input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on public endpoints
- Set appropriate CORS headers
- Use security headers (Helmet)
- Never expose sensitive data in error messages

## API Reference

Base URL examples assume:

```text
http://localhost:5000
```

API routes are generally under:

```text
http://localhost:5000/api
```

### Health Check

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Check whether the backend process is alive and database is connected |

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### Authentication

Mounted at `/api/auth`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Register a new user account |
| POST | `/api/auth/login` | No | Login and receive authentication tokens |
| POST | `/api/auth/refresh` | Refresh token | Refresh access token using refresh cookie |
| GET | `/api/auth/me` | Yes | Return authenticated user profile |
| PATCH | `/api/auth/profile` | Yes | Update profile fields and optional profile photo |
| POST | `/api/auth/logout` | No | Clear refresh cookie and logout user |
| GET | `/api/auth/number-plates` | No | List active number plates for registration |

**Registration Request:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+254700000000",
  "parentIdType": "National ID",
  "parentIdNumber": "12345678",
  "numberPlate": "PLATE-001",
  "role": "Driver",
  "password": "SecurePassword123!"
}
```

**Registration Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Driver"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Driver",
      "numberPlate": "PLATE-001"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Refresh Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Profile Update Request:**
```json
{
  "firstName": "Simon",
  "lastName": "Mwangi",
  "phoneNumber": "+254700000000"
}
```

**Profile Update with Photo:**
```json
{
  "firstName": "Simon",
  "lastName": "Mwangi",
  "phoneNumber": "+254700000000",
  "profilePhoto": [file data]
}
```

### Fleet and Vehicles

Mounted at `/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/number-plates` | Yes | List all number plates |
| GET | `/api/number-plates/active` | Yes | List only active number plates |
| POST | `/api/number-plates` | Yes | Create a new number plate |
| PATCH | `/api/number-plates/:id` | Yes | Update number plate status |
| DELETE | `/api/number-plates/:id` | Yes | Delete/remove number plate |
| GET | `/api/vehicle-details` | Yes | List all vehicle detail records |
| GET | `/api/vehicle-details/:plateNumber` | Yes | Fetch vehicle details by plate number |
| GET | `/api/vehicles/:plateNumber` | Yes | Fetch vehicle details by plate (alias) |
| PUT | `/api/vehicles/:plateNumber` | Yes | Update vehicle details |

**Number Plate Object:**
```json
{
  "id": 1,
  "plate_number": "KDA123A",
  "status": "active",
  "created_at": "2026-01-15T10:00:00.000Z",
  "updated_at": "2026-01-15T10:00:00.000Z"
}
```

**Vehicle Details Object:**
```json
{
  "id": 1,
  "plateNumber": "KDA123A",
  "model": "Toyota Coaster",
  "type": "School Bus",
  "year": 2020,
  "capacity": 33,
  "color": "White",
  "fuelType": "Diesel",
  "status": "Active",
  "assignedDriver": "Driver Name",
  "assignedAssistant": "Assistant Name",
  "assignedRoute": "RT-001",
  "lastService": "2026-01-10",
  "mileage": 150000
}
```

### Transport Calendar

Mounted at `/api/transport-manager`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/transport-manager/academic-years` | Yes | List all academic years |
| POST | `/api/transport-manager/academic-years` | Yes | Create new academic year |
| PUT | `/api/transport-manager/academic-years/:id` | Yes | Update academic year |
| DELETE | `/api/transport-manager/academic-years/:id` | Yes | Delete academic year |
| GET | `/api/transport-manager/academic-terms` | Yes | List all academic terms |
| POST | `/api/transport-manager/academic-terms` | Yes | Create new academic term |
| PUT | `/api/transport-manager/academic-terms/:id` | Yes | Update academic term |
| DELETE | `/api/transport-manager/academic-terms/:id` | Yes | Delete academic term |
| GET | `/api/transport-manager/calendar-events` | Yes | List all calendar events |
| POST | `/api/transport-manager/calendar-events` | Yes | Create calendar event |
| PUT | `/api/transport-manager/calendar-events/:id` | Yes | Update calendar event |
| DELETE | `/api/transport-manager/calendar-events/:id` | Yes | Delete calendar event |
| GET | `/api/transport-manager/transport/availability/:date` | Yes | Check transport availability for date |

**Academic Year Object:**
```json
{
  "id": 1,
  "name": "2026-2027",
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "status": "Active",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Academic Term Object:**
```json
{
  "id": 1,
  "academicYearId": 1,
  "name": "Term 1",
  "startDate": "2026-01-15",
  "endDate": "2026-04-15",
  "status": "Active",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Calendar Event Object:**
```json
{
  "id": 1,
  "date": "2026-08-15",
  "title": "Independence Day",
  "description": "National holiday - schools closed",
  "eventType": "Holiday",
  "priority": "Standard",
  "transportAvailable": false,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Transport Availability Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-08-15",
    "transportAvailable": false,
    "reason": "Holiday: Independence Day"
  }
}
```

### Routes

Mounted at `/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/routes` | Yes | List all route records |
| POST | `/api/routes` | Yes | Create a new route |
| PUT | `/api/routes/:id` | Yes | Update a route by numeric ID |
| PATCH | `/api/routes/:id/status` | Yes | Update route status |
| DELETE | `/api/routes/:id` | Yes | Delete a route |

**Route Object:**
```json
{
  "id": 1,
  "routeId": "RT-001",
  "routeName": "Route 1",
  "description": "Morning and evening routes",
  "vehiclePlate": "KDA123A",
  "vehicleModel": "Toyota Coaster",
  "assignedDriver": "Driver Name",
  "assignedAssistant": "Assistant Name",
  "totalStops": 15,
  "status": "Active",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Create Route Request:**
```json
{
  "routeId": "RT-004",
  "routeName": "Route 4",
  "description": "Morning and evening routes",
  "vehiclePlate": "KDA123A",
  "assignedDriver": "Driver Name",
  "assignedAssistant": "Assistant Name",
  "totalStops": 20,
  "status": "Active"
}
```

### Stops

Mounted at `/api`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/stops` | Yes | List all stops with route information |
| POST | `/api/stops` | Yes | Create a new stop |
| PUT | `/api/stops/:id` | Yes | Update a stop |
| PATCH | `/api/stops/:id/sequence` | Yes | Update stop sequence order |
| DELETE | `/api/stops/:id` | Yes | Soft-delete a stop |

**Stop Object:**
```json
{
  "id": 1,
  "stopCode": "ST-001",
  "stopName": "Stop Name",
  "stopType": "Pickup",
  "address": "Street Address",
  "landmark": "Near Landmark",
  "sequence": 1,
  "routeId": 1,
  "routeCode": "RT-001",
  "status": "Active",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

**Create Stop Request:**
```json
{
  "stopCode": "ST-001",
  "stopName": "Stop Name",
  "stopType": "Pickup",
  "address": "Street Address",
  "landmark": "Near Landmark",
  "sequence": 1,
  "routeCode": "RT-001"
}
```

### Staff

Mounted at `/api/transport-manager`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/transport-manager/staff` | Yes | List all staff members |
| GET | `/api/transport-manager/staff/role/:role` | Yes | List staff by role |

**Staff Object:**
```json
{
  "id": 1,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+254700000000",
  "role": "Driver",
  "status": "Active",
  "numberPlate": "KDA123A"
}
```

### Fuel and Maintenance

Mounted at `/api/fuel-maintenance`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/fuel-maintenance/requests` | Driver, Bus Assistant, Transport Manager, School Admin | List all requests |
| GET | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Get one request by ID |
| POST | `/api/fuel-maintenance/requests` | Driver, Bus Assistant | Create new request |
| PUT | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Update request |
| PATCH | `/api/fuel-maintenance/requests/:id/status` | Transport Manager, School Admin | Update request status |
| DELETE | `/api/fuel-maintenance/requests/:id` | Driver, Bus Assistant, Transport Manager, School Admin | Delete request |

**Fuel/Maintenance Request Object:**
```json
{
  "id": 1,
  "requestDate": "2026-06-02",
  "requestTime": "08:30",
  "numberPlate": "KDA123A",
  "currentMileage": 143250,
  "requestType": "Fuel",
  "category": "Fuels & Oils",
  "description": "Refueling for morning route",
  "amount": 12000,
  "confirmedBy": "Transport Manager",
  "status": "Approved",
  "createdByUserId": 5,
  "createdAt": "2026-06-02T08:30:00.000Z",
  "updatedAt": "2026-06-02T09:00:00.000Z"
}
```

**Create Request Request:**
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
  "confirmedBy": "Transport Manager"
}
```

### Incidents

Mounted at `/api/incidents`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/incidents/reports` | Driver, Bus Assistant | List own incident reports |
| POST | `/api/incidents/reports` | Driver, Bus Assistant | Create incident report with optional images |
| GET | `/api/incidents/all/reports` | Transport Manager, School Admin | List all incident reports |
| PATCH | `/api/incidents/reports/:id/status` | Transport Manager, School Admin | Update incident status |

**Incident Report Object:**
```json
{
  "id": 1,
  "incidentDate": "2026-06-15",
  "incidentTime": "14:30",
  "pointOfIncident": "Waiyaki Way",
  "childrenInvolved": "3 students",
  "description": "Minor accident with no injuries",
  "actionTaken": "Called parents, continued route",
  "numberPlate": "KDA123A",
  "status": "Resolved",
  "confirmedBy": "Transport Manager",
  "createdByUserId": 3,
  "createdAt": "2026-06-15T14:30:00.000Z",
  "updatedAt": "2026-06-15T15:00:00.000Z",
  "uploads": [
    {
      "id": 1,
      "fileName": "incident_photo_1.jpg",
      "fileKey": "incidents/2026/06/15/incident_photo_1.jpg",
      "fileUrl": "https://pub-xxx.r2.dev/incidents/2026/06/15/incident_photo_1.jpg",
      "createdAt": "2026-06-15T14:35:00.000Z"
    }
  ]
}
```

### Complaints

Mounted at `/api/complaints`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/complaints/meta` | Driver, Bus Assistant | Fetch complaint form metadata |
| GET | `/api/complaints/reports` | Driver, Bus Assistant | List own complaint reports |
| POST | `/api/complaints/reports` | Driver, Bus Assistant | Create complaint report with optional attachment |
| GET | `/api/complaints/all/reports` | Transport Manager, School Admin | List all complaint reports |
| PATCH | `/api/complaints/reports/:id/status` | Transport Manager, School Admin | Update complaint status |

**Complaint Report Object:**
```json
{
  "id": 1,
  "requestedBy": "Reporter Name",
  "contactPhoneNumber": "+254700000000",
  "numberPlate": "KDA123A",
  "timing": "Morning",
  "tripNumber": 1,
  "complaintType": "Learner",
  "learnerName": "Student Name",
  "details": "Student was not picked up on time",
  "status": "Pending",
  "confirmedBy": null,
  "createdByUserId": 3,
  "createdAt": "2026-06-15T10:00:00.000Z",
  "updatedAt": "2026-06-15T10:00:00.000Z",
  "attachment": {
    "id": 1,
    "fileName": "evidence.pdf",
    "fileKey": "complaints/2026/06/15/evidence.pdf",
    "fileUrl": "https://pub-xxx.r2.dev/complaints/2026/06/15/evidence.pdf",
    "createdAt": "2026-06-15T10:05:00.000Z"
  }
}
```

### Compliance Documents

Mounted at `/api/compliance-documents`.

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/compliance-documents/documents` | Driver | List driver's uploaded compliance documents |
| POST | `/api/compliance-documents/documents` | Driver | Upload a compliance document |

**Compliance Document Object:**
```json
{
  "id": 1,
  "relatedTo": "Driver",
  "documentType": "Driving License",
  "validFromDate": "2026-01-01",
  "validToDate": "2026-12-31",
  "uploadedBy": "Uploader Name",
  "fileName": "license_copy.pdf",
  "fileKey": "compliance/2026/01/01/license_copy.pdf",
  "fileUrl": "https://pub-xxx.r2.dev/compliance/2026/01/01/license_copy.pdf",
  "createdByUserId": 3,
  "createdAt": "2026-01-01T10:00:00.000Z",
  "updatedAt": "2026-01-01T10:00:00.000Z"
}
```

### Students

Mounted at `/api/students`.

All student routes require `School Admin` role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/students` | Fetch student dashboard data (admissions, withdrawals, parent contact changes) |
| POST | `/api/students/admissions` | Admit a new student |
| PATCH | `/api/students/:studentId/parent-contact` | Update parent contact and record audit history |
| PATCH | `/api/students/:studentId/withdrawal` | Mark a student as withdrawn |
| PATCH | `/api/students/:studentId/master-data` | Update student master data (name, grade, stream) |

**Student Object:**
```json
{
  "id": 1,
  "admissionNumber": "ADM-2026-001",
  "firstName": "Jane",
  "lastName": "Smith",
  "grade": "Grade 1",
  "stream": "A",
  "parentContact": "+254700000000",
  "parentIdType": "National ID",
  "parentIdNumber": "12345678",
  "admissionDate": "2026-01-15",
  "status": "active",
  "withdrawalDate": null,
  "withdrawalReason": null,
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

### Parent

Mounted at `/api/parent`.

All parent routes require `Parent` role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/parent/children` | Fetch children for the authenticated parent |

**Parent Child Object:**
```json
{
  "id": 1,
  "admissionNumber": "ADM-2026-001",
  "firstName": "Jane",
  "lastName": "Smith",
  "grade": "Grade 1",
  "stream": "A",
  "status": "active",
  "admissionDate": "2026-01-15",
  "withdrawalDate": null,
  "withdrawalReason": null
}
```

### Trips

Mounted at `/api/trips`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/trips/date/:date` | Get trips for a specific date |
| GET | `/api/trips/:id` | Get trip details by ID |
| PATCH | `/api/trips/:id/status` | Update trip status |

**Trip Object:**
```json
{
  "id": 1,
  "tripId": "TRIP-2026-06-15-M-001",
  "routeId": 1,
  "routeCode": "RT-001",
  "routeName": "Route 1 - Westlands",
  "vehiclePlate": "KDA123A",
  "driverName": "Driver Name",
  "assistantName": "Assistant Name",
  "departureTime": "07:00",
  "status": "In Progress",
  "tripType": "Morning",
  "stopsCompleted": 5,
  "totalStops": 15
}
```

### Users

Mounted at `/api/users`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/users` | No route guard currently | List users, optionally filtered by query |
| GET | `/api/users/me` | Yes | Return authenticated user profile |

**User Object:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+254700000000",
  "role": "Transport Manager",
  "numberPlate": null,
  "profilePhotoUrl": "https://pub-xxx.r2.dev/profiles/user_1.jpg",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
``` |

## Transport Calendar

The Transport Calendar is a core feature that enables transport managers to configure when school transport services operate. It provides a centralized interface for managing academic years, terms, holidays, and special events that affect transport availability.

### Key Features

- **Academic Year Management**: Create and manage academic years with configurable start and end dates
- **Term Management**: Define academic terms (e.g., Term 1, Term 2, Term 3) within academic years with the ability to edit term details
- **Holiday Configuration**: Add and manage holidays with dates, descriptions, and transport availability settings
- **Calendar Events**: Create custom calendar events for special occasions (exams, sports days, make-up days)
- **Transport Availability**: Configure whether transport services run on specific dates
- **Priority Event Overrides**: Priority event types (make-up, exam, sports) override standard holiday transport restrictions
- **Date-Specific Overrides**: Allow transport on specific holiday dates when needed
- **Database Integration**: All calendar data is stored in and retrieved from the database - no hardcoded or mock data

### Calendar Impact on Operations

The transport calendar directly affects:

- **Daily Trip Generation**: The automated daily trip generation job (runs at 3:00 AM Nairobi time) checks the transport calendar before creating trips. Trips are only generated for dates where transport is enabled.
- **Route Planning**: Transport availability for specific dates influences route assignment and scheduling decisions
- **Attendance Tracking**: Calendar events and holidays are reflected in attendance records and parent notifications

### API Endpoints

The transport calendar is accessible through the following endpoints under `/api/transport-manager`:

- `GET /api/transport-manager/academic-years` - List all academic years
- `GET /api/transport-manager/academic-terms` - List all academic terms
- `GET /api/transport-manager/calendar-events` - List all calendar events (holidays and special events)
- `GET /api/transport-manager/transport/availability/:date` - Check transport availability for a specific date

### Database Tables

The transport calendar uses the following database tables:

- `academic_years` - Stores academic year definitions with start/end dates
- `academic_terms` - Stores term definitions linked to academic years
- `calendar_events` - Stores holidays and special calendar events with priority levels

### Event Priority System

Calendar events have a priority system that determines transport availability:

1. **Standard Holidays**: Default transport restriction applies
2. **Priority Events**: Make-up days, exam days, and sports days override holiday restrictions
3. **Manual Overrides**: Transport managers can manually enable/disable transport for specific dates

### Date Formatting

All dates are stored in the database in `YYYY-MM-DD` format and are displayed in a user-friendly format in the frontend calendar interface.

## Database Model

Complete database schema with all tables, relationships, and constraints.

### Core User and Authentication Tables

**users**
- Stores user accounts, authentication credentials, and profile information
- Primary key: `id` (auto-increment)
- Columns: id, email, password_hash, first_name, last_name, phone_number, role, number_plate, profile_photo_url, status, created_at, updated_at
- Relationships: References number_plates via number_plate (for drivers/assistants)
- Indexes: email (unique), role, status

**number_plates**
- Stores vehicle registration and status
- Primary key: `id` (auto-increment)
- Columns: id, plate_number (unique), status, created_at, updated_at
- Relationships: Referenced by users, vehicle_details, vehicle_route_assignments
- Indexes: plate_number (unique), status

**vehicle_details**
- Stores extended vehicle information
- Primary key: `id` (auto-increment) 
- Columns: id, plate_number (unique), model, type, year, capacity, color, fuel_type, status, assigned_driver, assigned_assistant, assigned_route, last_service, mileage, created_at, updated_at
- Relationships: References number_plates via plate_number
- Indexes: plate_number (unique), status

### Transport Operation Tables

**routes**
- Stores route definitions and assignments
- Primary key: `id` (auto-increment)
- Columns: id, route_id (unique), route_name, description, vehicle_plate, vehicle_model, assigned_driver, assigned_assistant, total_stops, status, created_at, updated_at, deleted_at
- Relationships: References number_plates via vehicle_plate, users via assigned_driver/assistant
- Indexes: route_id (unique), status, vehicle_plate

**stops**
- Stores route stop information
- Primary key: `id` (auto-increment)
- Columns: id, stop_code, stop_name, stop_type, address, landmark, sequence, route_id, status, created_at, updated_at, deleted_at
- Relationships: References routes via route_id
- Indexes: stop_code, route_id, sequence

**vehicle_route_assignments**
- Stores vehicle-to-route assignments with period support
- Primary key: `id` (auto-increment)
- Columns: id, vehicle_plate, route_id, time_period, driver_user_id, assistant_user_id, effective_from, effective_to, status, notes, created_at, updated_at, created_by_user_id
- Relationships: References number_plates via vehicle_plate, routes via route_id, users via driver_user_id/assistant_user_id/created_by_user_id
- Indexes: vehicle_plate, route_id, time_period, status, effective_from, effective_to
- Unique constraint: (vehicle_plate, route_id, time_period, effective_from)

**vehicle_route_assignment_history**
- Tracks all assignment changes for audit trail
- Primary key: `id` (hide-increment)
- Columns: id, assignment_id, vehicle_plate, route_id, time_period, change_type, old_driver_id, new_driver_id, old_assistant_id, new_assistant_id, old_status, new_status, old_effective_from, new_effective_from, old_effective_to, new_effective_to, change_reason, changed_by_user_id, changed_at
- Relationships: References vehicle_route_assignments via assignment_id, users via changed_by_user_id
- Indexes: assignment_id, vehicle_plate, changed_at, change_type

### Calendar Tables

**academic_years**
- Stores academic year definitions
- Primary key: `id` (auto-increment)
- Columns: id, name, start_date, end_date, status, created_at, updated_at
- Indexes: name (unique), status

**academic_terms**
- Stores term definitions within academic years
- Primary key: `id` (auto-increment)
- Columns: id, academic_year_id, name, start_date, end_date, status, created_at, updated_at
- Relationships: References academic_years via academic_year_id
- Indexes: academic_year_id, status

**calendar_events**
- Stores holidays and special calendar events
- Primary key: `id` (auto-increment)
- Columns: id, date, title, description, event_type, priority, transport_available, created_at, updated_at
- Indexes: date, event_type, priority, transport_available

### Student Management Tables

**students**
- Stores student records
- Primary key: `id` (auto-increment)
- Columns: id, admission_number (unique), first_name, last_name, grade, stream, parent_contact, parent_id_type, parent_id_number, admission_date, status, withdrawal_date, withdrawal_reason, created_at, updated_at
- Indexes: admission_number (unique), status, grade, stream

**student_parent_contact_changes**
- Tracks parent contact change history
- Primary key: `id` (auto-increment)
- Columns: id, student_id, previous_contact, new_contact, changed_by_user_id, changed_at
- Relationships: References students via student_id, users via changed_by_user_id
- Indexes: student_id, changed_at

**student_route_assignment**
- Links students to routes and stops
- Primary key: `id` (auto-increment)
- Columns: id, student_id, route_id, pickup_stop_id, dropoff_stop_id, status, assigned_date, created_at, updated_at
- Relationships: References students via student_id, routes via route_id, stops via pickup_stop_id/dropoff_stop_id
- Indexes: student_id, route_id, status

### Request and Report Tables

**fuel_maintenance_requests**
- Stores fuel and maintenance requests
- Primary key: `id` (auto-increment)
- Columns: id, request_date, request_time, number_plate, current_mileage, request_type, category, description, amount, confirmed_by, status, created_by_user_id, created_at, updated_at
- Relationships: References number_plates via number_plate, users via confirmed_by/created_by_user_id
- Indexes: number_plate, status, request_date, created_by_user_id

**incident_reports**
- Stores incident/accident reports
- Primary key: `id` (auto-increment)
- Columns: id, incident_date, incident_time, point_of_incident, children_involved, description, action_taken, number_plate, status, confirmed_by, created_by_user_id, created_at, updated_at
- Relationships: References number_plates via number_plate, users via confirmed_by/created_by_user_id
- Indexes: number_plate, status, incident_date, created_by_user_id

**complaint_reports**
- Stores complaint submissions
- Primary key: `id` (auto-increment)
- Columns: id, requested_by, contact_phone_number, number_plate, timing, trip_number, complaint_type, learner_name, details, status, confirmed_by, created_by_user_id, created_at, updated_at
- Relationships: References number_plates via number_plate, users via requested_by/confirmed_by/created_by_user_id
- Indexes: number_plate, status, created_by_user_id

**compliance_documents**
- Stores compliance document metadata
- Primary key: `id` (auto-increment)
- Columns: id, related_to, document_type, valid_from_date, valid_to_date, uploaded_by, file_name, file_key, file_url, created_by_user_id, created_at, updated_at
- Relationships: References users via uploaded_by/created_by_user_id
- Indexes: related_to, document_type, valid_to_date, created_by_user_id

### File Upload Tables

**uploads**
- Stores file upload metadata
- Primary key: `id` (auto-increment)
- Columns: id, user_id, file_name, file_key, file_url, file_size, mime_type, created_at
- Relationships: References users via user_id
- Indexes: user_id, file_key (unique)

**incident_report_uploads**
- Joins incident reports to upload records
- Primary key: id (auto-increment)
- Columns: id, incident_report_id, upload_id, created_at
- Relationships: References incident_reports via incident_report_id, uploads via upload_id
- Indexes: incident_report_id, upload_id

**complaint_report_uploads**
- Joins complaint reports to upload records
- Primary key: id (auto-increment)
- Columns: id, complaint_report_id, upload_id, created_at
- Relationships: References complaint_reports via complaint_report_id, uploads via upload_id
- Indexes: complaint_report_id, upload_id

### Trip Monitoring Tables

**trip_monitoring**
- Stores trip execution state and monitoring data
- Primary key: `id` (auto-increment)
- Columns: id, trip_id, route_id, vehicle_plate, driver_id, assistant_id, scheduled_departure, actual_departure, start_location, end_location, status, created_at, updated_at
- Relationships: References routes via route_id, number_plates via vehicle_plate, users via driver_id/assistant_id
- Indexes: trip_id, route_id, vehicle_plate, status

**trip_stops**
- Stores per-stop trip timing and boarding/alighting data
- Primary key: `id` (infinite increment)
- Columns: id, trip_id, stop_id, stop_sequence, scheduled_arrival, actual_arrival, scheduled_departure, actual_departure, boarded_count, alighted_count, status, created_at, updated_at
- Relationships: References trip_monitoring via trip_id, stops via stop_id
- Indexes: trip_id, stop_id, stop_sequence

### Route Operations Tables

**daily_schedule**
- Stores route schedule records
- Primary key: `id` (auto-increment)
- Columns: id, route_id, day_of_week, departure_time, return_time, is_active, created_at, updated_at
- Relationships: References routes via route_id
- Indexes: route_id, day_of_week

**route_assignment_history**
- Tracks route assignment changes over time
- Primary key: `id` (auto-increment)
- Columns: id, route_id, old_vehicle_plate, new_vehicle_plate, old_driver_id, new_driver_id, old_assistant_id, new_assistant_id, changed_by_user_id, changed_at
- Relationships: References routes via route_id, number_plates via old_vehicle_plate/new_vehicle_plate, users via old_driver_id/new_driver_id/old_assistant_id/new_assistant_id/changed_by_user_id
- Indexes: route_id, changed_at

**student_route_assignment**
- Links students to routes and stops (duplicate of earlier section, consolidates)
- See student management section above

**route_optimization_logs**
- Stores route optimization inputs/results and suggestions
- Primary key: `id` (auto-increment)
- Columns: id, route_id, optimization_type, input_data, output_data, suggestions, created_by_user_id, created_at, updated_at
- Relationships: References routes via route_id, users via created_by_user_id
- Indexes: route_id, optimization_type, created_at

### Foreign Key Relationships

**Vehicle Relationships:**
- `users.number_plate` → `number_plates.plate_number` (on update cascade, on delete restrict)
- `vehicle_details.plate_number` → `number_plates.plate_number` (on update cascade, on delete restrict)
- `vehicle_route_assignments.vehicle_plate` → `number_plates.plate_number` (on update cascade, on delete restrict)

**Route Relationships:**
- `stops.route_id` → `routes.id` (on update cascade, on delete restrict)
- `vehicle_route_assignments.route_id` → `routes.id` (on update cascade, on delete restrict)
- `trip_monitoring.route_id` → `routes.id` (on update cascade, on delete restrict)

**Staff Relationships:**
- `vehicle_route_assignments.driver_user_id` → `users.id` (on update cascade, on delete set null)
- `vehicle_route_assignments.assistant_user_id` → `users.id` (on update cascade, on delete set null)
- `incident_reports.created_by_user_id` → `users.id` (on update cascade, on delete set null)
- `complaint_reports.created_by_user_id` → `users.id` (on update cascade, on delete set null)

**Student Relationships:**
- `student_parent_contact_changes.student_id` → `students.id` (on update cascade, on delete cascade)
- `student_route_assignment.student_id` → `students.id` (on update cascade, on delete cascade)

**Upload Relationships:**
- `uploads.user_id` → `users.id` (on update cascade, on delete cascade)
- `incident_report_uploads.incident_report_id` → `incident_reports.id` (on update cascade, on delete cascade)
- `complaint_report_uploads.complaint_report_id` → `complaint_reports.id` (on update cascade, on delete cascade)

**Calendar Relationships:**
- `academic_terms.academic_year_id` → `academic_years.id` (on update cascade, on delete cascade)

### Index Summary

**Performance Indexes:**
- All foreign key columns are indexed
- Frequently queried columns (status, date fields) are indexed
- Unique constraints on natural keys (plate_number, admission_number, route_id, etc.)
- Composite indexes for common query patterns

**Security Indexes:**
- User email indexed for fast login lookups
- Role indexed for authorization checks
- Status indexed for filtering active/inactive records

## File Uploads

The backend includes a comprehensive file upload system using Multer for parsing and Cloudflare R2 (S3-compatible) for storage.

### Supported Upload Types

1. **Profile Photos** - User profile pictures
2. **Incident Images** - Photos attached to incident reports
3. **Complaint Attachments** - Documents attached to complaint reports
4. **Compliance Documents** - Driver compliance documents (license, insurance, etc.)

### Upload Configuration

**Middleware Configuration (`middlewares/upload.js`):**

```javascript
const storage = multer.memoryStorage(); // For cloud storage
// OR
const storage = multer.diskStorage({ // For local storage
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // File type validation
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### Cloudflare R2 Integration

**Environment Variables Required:**
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_BASE_URL=https://pub-your-bucket-id.r2.dev
```

**Upload Service:**

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(file, folder) {
  const key = `${folder}/${Date.now()}-${file.originalname}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  await s3Client.send(command);
  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
}
```

### File Upload Endpoints

**Profile Photo Upload:**
- Endpoint: `PATCH /api/auth/profile`
- Auth: Required
- File field: `profilePhoto`
- Max size: 5MB
- Allowed types: JPEG, PNG

**Incident Images Upload:**
- Endpoint: `POST /api/incidents/reports`
- Auth: Required (Driver, Bus Assistant)
- File field: `images` (multiple)
- Max size: 5MB per file
- Allowed types: JPEG, PNG

**Complaint Attachment Upload:**
- Endpoint: `POST /api/complaints/reports`
- Auth: Required (Driver, Bus Assistant)
- File field: `attachment`
- Max size: 5MB
- Allowed types: PDF, DOC, DOCX, JPEG, PNG

**Compliance Document Upload:**
- Endpoint: `POST /api/compliance-documents/documents`
- Auth: Required (Driver)
- File field: `document`
- Max size: 10MB
- Allowed types: PDF, DOC, DOCX, JPEG, PNG

### File Naming Convention

Files are stored with the following naming pattern:
```
{folder}/{timestamp}-{original_filename}
```

**Folder Structure:**
- `profiles/` - User profile photos
- `incidents/{year}/{month}/` - Incident images
- `complaints/{year}/{month}/` - Complaint attachments
- `compliance/{year}/{month}/` - Compliance documents

**Example:**
```
profiles/20240115-user_1.jpg
incidents/2024/06/15/incident_photo_1.jpg
complaints/2024/06/15/evidence.pdf
compliance/2024/01/01/license_copy.pdf
```

### Database Storage

Upload metadata is stored in the database:

**uploads table:**
```sql
CREATE TABLE uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_key VARCHAR(500) NOT NULL UNIQUE,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Relationship tables:**
- `incident_report_uploads` - Links incidents to uploads
- `complaint_report_uploads` - Links complaints to uploads

### Troubleshooting Upload Issues

**Upload Fails with 401 Unauthorized:**
- Verify user is authenticated
- Check Bearer token is included in request
- Verify user has permission to upload

**Upload Fails with 413 Payload Too Large:**
- Check file size exceeds limit
- Reduce file size or increase limit in upload middleware

**Upload Fails with Invalid File Type:**
- Check file type is allowed
- Verify file extension matches MIME type
- Check file filter configuration

**R2 Upload Fails:**
- Verify R2 credentials are correct
- Check bucket exists and is accessible
- Verify R2 account ID is correct
- Check network connectivity to R2 endpoint

**File Not Accessible After Upload:**
- Verify R2_PUBLIC_BASE_URL is correct
- Check bucket is public or has proper CORS configuration
- Verify file key is stored correctly in database

### Security Considerations

- File type validation on both client and server
- File size limits to prevent abuse
- Sanitize file names to prevent path traversal
- Use HTTPS for all upload operations
- Store files in object storage, not local filesystem
- Implement proper CORS configuration for R2 bucket
- Never execute uploaded files
- Validate file content, not just extension

## Logging

The backend uses Morgan for HTTP request logging with custom log streams for production-grade logging.

### Logger Configuration

**Log Stream Setup (`utils/logger.js`):**

```javascript
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write streams
const combinedLogStream = fs.createWriteStream(
  path.join(logsDir, 'combined.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

module.exports = {
  combinedLogStream,
  errorLogStream
};
```

**Morgan Configuration (`app.js`):**

```javascript
const morgan = require('morgan');
const { combinedLogStream, errorLogStream } = require('./src/utils/logger');

// Log format
const logFormat = ':method :url :status :response-time ms - :res[content-length]';

// All requests to combined log
app.use(morgan(logFormat, { stream: combinedLogStream }));

// Errors (4xx, 5xx) to error log
app.use(morgan(logFormat, {
  stream: errorLogStream,
  skip: (req, res) => res.statusCode < 400
}));

// Console logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
```

### Log File Locations

**Development Environment:**
- Combined log: `backend/logs/combined.log`
- Error log: `backend/logs/error.log`

**Production Environment:**
- Combined log: `/var/log/soho/combined.log`
- Error log: `/var/log/soho/error.log`

### Log Format

**Combined Log Format:**
```
:method :url :status :response-time ms - :res[content-length]
```

**Example:**
```
GET /api/vehicles 200 45 ms - 1234
POST /api/auth/login 200 120 ms - 567
GET /api/users 401 23 ms - 89
```

**Error Log Format:**
Same as combined log, but only includes requests with status codes 400+

### Log Rotation

**Manual Log Rotation:**
```bash
# Archive old logs
mv logs/combined.log logs/combined_$(date +%Y%m%d).log
mv logs/error.log logs/error_$(date +%Y%m%d).log

# Create new log files
touch logs/combined.log
touch logs/error.log

# Restart application
pm2 restart soho-backend
```

**Automated Log Rotation (Cron):**
```bash
# Add to crontab for daily rotation at midnight
0 0 * * * mv /var/log/soho/combined.log /var/log/soho/combined_$(date +\%Y\%m\%d).log && touch /var/log/soho/combined.log
0 0 * * * mv /var/log/soho/error.log /var/log/soho/error_$(date +\%Y\%m\%d).log && touch /var/log/soho/error.log
```

**Log Rotation with logrotate (Production):**

Create `/etc/logrotate.d/soho`:
```
/var/log/soho/*.log {
  daily
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 www-data www-data
  sharedscripts
  postrotate
    pm2 reload soho-backend
  endscript
}
```

### Viewing Logs

**View all logs in real-time:**
```bash
tail -f backend/logs/combined.log
```

**View only errors:**
```bash
tail -f backend/logs/error.log
```

**View last 100 lines:**
```bash
tail -n 100 backend/logs/combined.log
```

**Search for specific patterns:**
```bash
grep "POST /api/auth/login" backend/logs/combined.log
grep "401" backend/logs/error.log
```

**View logs for specific date:**
```bash
grep "2026-01-15" backend/logs/combined.log
```

### Log Analysis

**Count requests by status:**
```bash
awk '{print $3}' backend/logs/combined.log | sort | uniq -c
```

**Find slow requests (>1 second):**
```bash
awk '$5 > 1000' backend/logs/combined.log
```

**Count requests by endpoint:**
```bash
awk '{print $2}' backend/logs/combined.log | sort | uniq -c | sort -rn
```

**Average response time:**
```bash
awk '{sum+=$5; count++} END {print sum/count}' backend/logs/combined.log
```

### Security Logging

**Sensitive Data Handling:**
- Passwords are never logged
- Tokens are partially masked in logs
- Credit card numbers are never logged
- Personal data is minimized in logs

**Audit Logging:**
Separate audit log tracks sensitive operations:
- User authentication (success/failure)
- Data changes (create/update/delete)
- Permission changes
- Configuration changes

### Log Retention Policy

**Development:**
- Keep logs for 7 days
- Manual cleanup required

**Production:**
- Keep combined logs for 30 days
- Keep error logs for 90 days
- Keep audit logs for 1 year
- Automated rotation via logrotate

### Performance Monitoring

**Log Performance Metrics:**
- Response time for each request
- Status code distribution
- Request count per endpoint
- Error rate tracking

**Alerts:**
- High error rate (>5%)
- Slow response times (>2s)
- Database connection errors
- Authentication failures

## Postman Collection

A comprehensive Postman collection is included for API testing and documentation.

### Collection Files

Located in `docs/postman/`:

- `Soho-Transport-API.postman_collection.json` - Complete API collection with all endpoints
- `Soho-Transport-Local.postman_environment.json` - Local development environment variables

### Importing the Collection

1. Open Postman
2. Click "Import" in the top left
3. Select both files from `docs/postman/`
4. Click "Import" to load the collection

### Using the Collection

**Environment Setup:**

1. Select the "Soho Transport Local" environment from the environment dropdown
2. Verify the following variables are set:
   - `baseUrl` - Should be `http://localhost:5000`
   - `accessToken` - Will be set after successful login
   - `refreshToken` - Will be set after successful login

**Authentication Flow:**

1. Navigate to "Auth" folder
2. Run "POST /api/auth/register" to create a test user
3. Run "POST /api/auth/login" to authenticate
4. Postman will automatically set `accessToken` from the response
5. All subsequent requests will use this token

**Running Requests:**

- Click on any request to view details
- Click "Send" to execute the request
- View response in the bottom panel
- Check status code and response body

**Collection Structure:**

```
Soho Transport API
├── Auth
│   ├── POST /api/auth/register
│   ├── POST /api/auth/login
│   ├── POST /api/auth/refresh
│   ├── GET /api/auth/me
│   ├── PATCH /api/auth/profile
│   └── POST /api/auth/logout
├── Fleet
│   ├── GET /api/number-plates
│   ├── GET /api/number-plates/active
│   ├── POST /api/number-plates
│   ├── PATCH /api/number-plates/:id
│   ├── DELETE /api/number-plates/:id
│   ├── GET /api/vehicle-details
│   └── GET /api/vehicle-details/:plateNumber
├── Transport Calendar
│   ├── GET /api/transport-manager/academic-years
│   ├── POST /api/transport-manager/academic-years
│   ├── GET /api/transport-manager/academic-terms
│   ├── POST /api/transport-manager/academic-terms
│   ├── GET /api/transport-manager/calendar-events
│   ├── POST /api/transport-manager/calendar-events
│   └── GET /api/transport-manager/transport/availability/:date
├── Routes
│   ├── GET /api/routes
│   ├── POST /api/routes
│   ├── PUT /api/routes/:id
│   ├── PATCH /api/routes/:id/status
│   └── DELETE /api/routes/:id
├── Stops
│   ├── GET /api/stops
│   ├── POST /api/stops
│   ├── PUT /api/stops/:id
│   ├── PATCH /api/stops/:id/sequence
│   └── DELETE /api/stops/:id
├── Staff
│   ├── GET /api/transport-manager/staff
│   └── GET /api/transport-manager/staff/role/:role
├── Fuel & Maintenance
│   ├── GET /api/fuel-maintenance/requests
│   ├── POST /api/fuel-maintenance/requests
│   ├── PUT /api/fuel-maintenance/requests/:id
│   ├── PATCH /api/fuel-maintenance/requests/:id/status
│   └── DELETE /api/fuel-maintenance/requests/:id
├── Incidents
│   ├── GET /api/incidents/reports
│   ├── POST /api/incidents/reports
│   ├── GET /api/incidents/all/reports
│   └── PATCH /api/incidents/reports/:id/status
├── Complaints
│   ├── GET /api/complaints/meta
│   ├── GET /api/complaints/reports
│   ├── POST /api/complaints/reports
│   ├── GET /api/complaints/all/reports
│   └── PATCH /api/complaints/reports/:id/status
├── Compliance Documents
│   ├── GET /api/compliance-documents/documents
│   └── POST /api/compliance-documents/documents
├── Students
│   ├── GET /api/students
│   ├── POST /api/students/admissions
│   ├── PATCH /api/students/:studentId/parent-contact
│   ├── PATCH /api/students/:studentId/withdrawal
│   └── PATCH /api/students/:studentId/master-data
├── Parent
│   └── GET /api/parent/children
└── Users
    ├── GET /api/users
    └── GET /api/users/me
```

### Running Collections

**Run Entire Collection:**
1. Click "Soho Transport API" collection
2. Click "Run collection" button
3. Select requests to run
4. Choose environment
5. Click "Run Soho Transport API"

**Run Folder:**
1. Right-click on a folder (e.g., "Fleet")
2. Select "Run folder"
3. Select requests to run
4. Click "Run"

### Tests

The collection includes automated tests for:

- Status code validation
- Response structure validation
- Required field presence
- Data type validation

**Viewing Test Results:**
- After running requests, view "Test Results" tab
- Failed tests will be highlighted in red
- Click on failed test to see details

### Updating the Collection

When adding new API endpoints:

1. Create new request in Postman
2. Add to appropriate folder
3. Add request description
4. Add example responses
5. Add tests for validation
6. Export updated collection
7. Commit to repository

### Environment Variables

**Local Environment:**
```json
{
  "baseUrl": "http://localhost:5000",
  "accessToken": "",
  "refreshToken": ""
}
```

**Production Environment (create new):**
```json
{
  "baseUrl": "https://api.yourdomain.com",
  "accessToken": "",
  "refreshToken": ""
}
```

## Docker and Deployment

### Docker for Development

The root `docker-compose.yml` provides a development environment with frontend and backend services.

**Docker Compose Development:**

```bash
# From repository root
docker compose up --build
```

**Services:**
- `frontend` - Vite development server on port 5173
- `backend` - Express backend on port 5000
- `mysql` - MySQL database on port 3306

**Access URLs:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- MySQL: `localhost:3306`

**Development Docker Compose Configuration:**

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_BACKEND_URL=http://backend:5000
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/logs:/app/logs
    environment:
      - DB_HOST=mysql
      - DB_USER=soho_user
      - DB_PASSWORD=soho_password
      - DB_NAME=Soho_Academy
      - PORT=5000
      - JWT_SECRET=dev_secret_change_in_production
      - FRONTEND_ORIGIN=http://localhost:5173
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=Soho_Academy
      - MYSQL_USER=soho_user
      - MYSQL_PASSWORD=soho_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./backend/src/migration:/docker-entrypoint-initdb.d

volumes:
  mysql_data:
```

**Development Dockerfiles:**

**Backend Dockerfile.dev:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
```

**Frontend Dockerfile.dev:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

### Docker for Production

Production Docker assets are in `deploy/docker/`.

**Production Docker Compose:**

```bash
cd deploy/docker
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

**Production Services:**
- `frontend-prod` - Nginx serving static React build on port 8080
- `backend-prod` - Node.js backend on port 5000
- `mysql-prod` - MySQL database

**Production Docker Compose Configuration:**

```yaml
version: '3.8'

services:
  frontend-prod:
    build:
      context: ../../frontend
      dockerfile: Dockerfile.prod
    ports:
      - "8080:80"
    depends_on:
      - backend-prod
    restart: unless-stopped

  backend-prod:
    build:
      context: ../../backend
      dockerfile: Dockerfile.prod
    ports:
      - "5000:5000"
    env_file:
      - .env.prod
    depends_on:
      - mysql-prod
    restart: unless-stopped

  mysql-prod:
    image: mysql:8.0
    ports:
      - "3306:3306"
    env_file:
      - .env.prod
    volumes:
      - mysql_prod_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_prod_data:
```

**Production Dockerfiles:**

**Backend Dockerfile.prod:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

EXPOSE 5000

CMD ["node", "server.js"]
```

**Frontend Dockerfile.prod:**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend-prod:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### PM2 Deployment

PM2 is used for process management in production deployments.

**PM2 Configuration (`deploy/pm2/ecosystem.config.cjs`):**

```javascript
module.exports = {
  apps: [
    {
      name: 'soho-backend',
      script: './server.js',
      cwd: '/var/www/soho/backend',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/log/soho/pm2-error.log',
      out_file: '/var/log/soho/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/soho.git',
      path: '/var/www/soho',
      'post-deploy': 'npm install && cd backend && npm ci --omit=dev && cd ../frontend && npm ci && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': 'apt-get install git'
    }
  }
};
```

**PM2 Commands:**

```bash
# Start application
pm2 start /var/www/soho/deploy/pm2/ecosystem.config.cjs

# Stop application
pm2 stop soho-backend

# Restart application
pm2 restart soho-backend

# Reload application (zero-downtime)
pm2 reload soho-backend

# View logs
pm2 logs soho-backend

# Monitor application
pm2 monit

# View status
pm2 status

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Nginx Deployment

Nginx serves as a reverse proxy and static file server.

**Nginx Configuration (`deploy/nginx/soho.conf`):**

```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend static files
    location / {
        root /var/www/soho/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

**Nginx Deployment Steps:**

```bash
# Copy Nginx configuration
sudo cp /var/www/soho/deploy/nginx/soho.conf /etc/nginx/sites-available/soho.conf

# Enable site
sudo ln -s /etc/nginx/sites-available/soho.conf /etc/nginx/sites-enabled/soho.conf

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Or restart
sudo systemctl restart nginx
```

### SSL/TLS Setup with Let's Encrypt

**Install Certbot:**

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**Obtain SSL Certificate:**

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Auto-renewal:**

```bash
# Test renewal
sudo certbot renew --dry-run

# Renewal is configured automatically via cron
# Verify: sudo systemctl status certbot.timer
```

### Production Deployment Checklist

**Pre-deployment:**
- [ ] Set up production server with required dependencies
- [ ] Configure environment variables
- [ ] Set up MySQL database
- [ ] Apply database schema
- [ ] Configure SSL certificates
- [ ] Set up DNS records
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Test deployment in staging environment

**Deployment:**
- [ ] Pull latest code from repository
- [ ] Install backend dependencies
- [ ] Build frontend
- [ ] Run database migrations
- [ ] Start backend with PM2
- [ ] Restart Nginx
- [ ] Verify health check endpoint
- [ ] Test authentication flow
- [ ] Test API endpoints
- [ ] Verify frontend loads correctly

**Post-deployment:**
- [ ] Monitor application logs
- [ ] Verify database connections
- [ ] Test file uploads
- [ ] Verify cron jobs are running
- [ ] Check system resources
- [ ] Monitor error rates
- [ ] Verify backup system
- [ ] Update documentation
- [ ] Notify stakeholders

### CI/CD Pipeline (Optional)

**GitHub Actions Example:**

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/soho
            git pull origin main
            cd backend && npm ci --omit=dev
            cd ../frontend && npm ci && npm run build
            pm2 reload ecosystem.config.cjs --env production
```

## Troubleshooting

### Backend Issues

**Backend fails to start**

**Symptoms:**
- `npm run dev` exits with error
- Port already in use error
- Database connection error

**Solutions:**

1. **Check MySQL is running:**
```bash
sudo systemctl status mysql
# Or on macOS
brew services list
```

2. **Verify database exists:**
```bash
mysql -u root -p -e "SHOW DATABASES;"
```

3. **Check `.env` file exists:**
```bash
ls -la backend/.env
```

4. **Verify database credentials:**
```bash
cat backend/.env | grep DB_
```

5. **Test database connection manually:**
```bash
mysql -u your_mysql_user -p Soho_Academy -e "SELECT 1;"
```

6. **Check if port is already in use:**
```bash
lsof -i :5000
# Kill process if needed
kill -9 <PID>
```

7. **Check logs for errors:**
```bash
tail -f backend/logs/error.log
```

**Database connection errors**

**Symptoms:**
- "Cannot connect to database"
- "Access denied for user"
- "Unknown database"

**Solutions:**

1. **Verify MySQL is running (see above)**

2. **Check database exists:**
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS Soho_Academy;"
```

3. **Apply schema if needed:**
```bash
mysql -u root -p Soho_Academy < backend/src/migration/schema.sql
```

4. **Check user permissions:**
```bash
mysql -u root -p -e "SHOW GRANTS FOR 'soho_user'@'localhost';"
```

5. **Update `.env` with correct credentials**

**JWT errors**

**Symptoms:**
- "Invalid token"
- "Token expired"
- "Malformed JWT"

**Solutions:**

1. **Check JWT_SECRET is set:**
```bash
cat backend/.env | grep JWT_SECRET
```

2. **Verify secret is strong (32+ characters)**

3. **Check token expiration:**
```bash
cat backend/.env | grep JWT_EXPIRES_IN
```

4. **Clear stored tokens and re-login**

5. **Check system time is correct (affects JWT expiration)**

### Frontend Issues

**Frontend cannot reach backend**

**Symptoms:**
- Network errors in browser console
- 502 Bad Gateway
- Connection refused

**Solutions:**

1. **Verify backend is running:**
```bash
curl http://localhost:5000/health
```

2. **Check frontend `.env` has correct URL:**
```bash
cat frontend/.env | grep VITE_BACKEND_URL
```

3. **Restart frontend dev server after changing `.env`:**
```bash
# Stop frontend (Ctrl+C)
npm run dev
```

4. **Check backend CORS configuration:**
```bash
cat backend/.env | grep FRONTEND_ORIGIN
```

5. **Verify no firewall blocking:**
```bash
sudo ufw status
```

**CORS errors**

**Symptoms:**
- "CORS policy" error in browser
- "Access-Control-Allow-Origin" missing

**Solutions:**

1. **Set FRONTEND_ORIGIN in backend `.env`:**
```env
FRONTEND_ORIGIN=http://localhost:5173
```

2. **Restart backend after changing `.env`**

3. **Check CORS middleware is configured in `app.js`**

**Build errors**

**Symptoms:**
- TypeScript compilation errors
- Module not found errors
- Build fails

**Solutions:**

1. **Check TypeScript version:**
```bash
npm list typescript
```

2. **Install dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check for circular dependencies**

4. **Verify all imports are correct**

5. **Check tsconfig.json configuration**

### Authentication Issues

**Login succeeds but protected APIs fail**

**Symptoms:**
- 401 Unauthorized on protected endpoints
- Token present but rejected
- Redirect to login page

**Solutions:**

1. **Check token is stored in localStorage:**
```javascript
// In browser console
localStorage.getItem('soho_auth_token')
```

2. **Verify token format (should be Bearer token)**

3. **Check token is included in request headers:**
```javascript
// In browser Network tab
// Check Authorization header
```

4. **Verify token hasn't expired:**
```javascript
// Decode JWT (jwt.io) to check exp claim
```

5. **Check user role matches endpoint requirements**

6. **Verify user status is Active**

**Registration fails**

**Symptoms:**
- Registration returns error
- User not created in database

**Solutions:**

1. **Check all required fields are provided**

2. **Verify email format is valid**

3. **Check password meets requirements**

4. **Verify number plate exists (for Driver/Bus Assistant)**

5. **Check if email already exists**

6. **Review validation error messages**

### Vehicle/Route Issues

**Driver or Bus Assistant registration fails**

**Symptoms:**
- Registration returns error
- Number plate validation fails

**Solutions:**

1. **Check number plate exists in database:**
```bash
mysql -u root -p Soho_Academy -e "SELECT * FROM number_plates WHERE plate_number = 'KDA123A';"
```

2. **Verify number plate status is 'active'**

3. **Check role string matches exactly: 'Driver' or 'Bus Assistant'**

4. **Verify number plate is not already assigned**

**Route select/dropdown shows blank options**

**Symptoms:**
- Dropdown options are empty
- Undefined values displayed

**Solutions:**

1. **Check API response format:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/routes
```

2. **Verify field names match (camelCase vs snake_case)**

3. **Check normalization in frontend component**

4. **Verify routes exist in database**

**Stops cannot be created**

**Symptoms:**
- Stop creation fails
- Route not found error

**Solutions:**

1. **Verify route exists**

2. **Check route code is correct (e.g., RT-001)**

3. **Verify sequence order is positive integer**

4. **Check route is not deleted**

5. **Verify route status is Active**

### Upload Issues

**Upload requests fail**

**Symptoms:**
- File upload fails
- 401 Unauthorized
- 413 Payload Too Large

**Solutions:**

1. **Check R2 credentials in `.env`:**
```bash
cat backend/.env | grep R2_
```

2. **Verify file type is allowed**

3. **Check file size is within limits**

4. **Verify network connectivity to R2 endpoint**

5. **Check bucket exists and is accessible**

6. **Verify user is authenticated**

7. **Check file name doesn't contain special characters**

**File not accessible after upload**

**Symptoms:**
- File URL returns 404
- Image doesn't load

**Solutions:**

1. **Verify R2_PUBLIC_BASE_URL is correct**

2. **Check bucket is public or has CORS configuration**

3. **Verify file key is stored correctly in database**

4. **Check file URL format**

### Transport Calendar Issues

**Calendar events not displaying**

**Symptoms:**
- Calendar is empty
- Events not showing

**Solutions:**

1. **Check database has data:**
```bash
mysql -u root -p Soho_Academy -e "SELECT * FROM calendar_events;"
```

2. **Verify API endpoint returns data:**
```bash
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/transport-manager/calendar-events
```

3. **Check browser console for JavaScript errors**

4. **Verify user has Transport Manager role**

**Cannot edit terms**

**Symptoms:**
- Edit functionality doesn't work
- Save fails

**Solutions:**

1. **Verify user has Transport Manager role**

2. **Check academic_terms table exists**

3. **Verify term ID is correct in API call**

4. **Check permissions on endpoint**

**Transport availability not working**

**Symptoms:**
- Availability always shows false
- Override doesn't work

**Solutions:**

1. **Check transport availability API endpoint**

2. **Verify calendar_events table has transport_available column**

3. **Check daily trip generation job logs**

4. **Verify priority event system is working**

### Performance Issues

**Slow API responses**

**Symptoms:**
- Requests take >2 seconds
- Database queries slow

**Solutions:**

1. **Check database indexes:**
```bash
mysql -u root -p Soho_Academy -e "SHOW INDEX FROM routes;"
```

2. **Check for slow queries:**
```bash
mysql -u root -p Soho_Academy -e "SHOW PROCESSLIST;"
```

3. **Optimize queries with EXPLAIN:**
```bash
mysql -u root -p Soho_Academy -e "EXPLAIN SELECT * FROM routes;"
```

4. **Check database connection pool settings**

5. **Add caching for frequently accessed data**

**Frontend slow to load**

**Symptoms:**
- Initial load >5 seconds
- Large bundle size

**Solutions:**

1. **Check bundle size:**
```bash
npm run build
# Check output for bundle sizes
```

2. **Implement code splitting**
3. **Lazy load components**
4. **Optimize images**
5. **Enable compression in Nginx**

### General Debugging Tips

**Enable debug mode:**
```bash
# Backend
NODE_ENV=development npm run dev

# Frontend
VITE_ENABLE_DEBUG_MODE=true npm run dev
```

**Check logs:**
```bash
# Backend logs
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# PM2 logs
pm2 logs soho-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**Test API directly:**
```bash
# Health check
curl http://localhost:5000/health

# With authentication
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/users/me
```

**Check database:**
```bash
# Connect to MySQL
mysql -u root -p Soho_Academy

# Check tables
SHOW TABLES;

# Check record counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM routes;
```

**Clear cache:**
```bash
# Browser cache
# In browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)

# Node modules
rm -rf node_modules package-lock.json
npm install

# PM2 cache
pm2 flush

# Browser localStorage
# In browser console: localStorage.clear()
```

## Known Gaps and Maintenance Notes

### Current Limitations

**Testing:**
- The backend test script is currently a placeholder
- No automated test suite is configured (Jest, Mocha, etc.)
- No integration tests for API endpoints
- No end-to-end tests for critical user flows
- No performance tests for load testing
- Manual testing is required for all features

**Database Migrations:**
- The database uses a schema file and service-level table guards rather than a formal migration framework
- No versioned migration system (like Knex.js or Sequelize migrations)
- Schema changes require manual SQL execution
- No automatic rollback mechanism for failed migrations
- Database seeding is manual
- No database schema diffing tools

**API Consistency:**
- Some frontend modules use shared `frontend/src/lib/api.ts`
- Other components still define local Axios instances
- Inconsistent error handling across endpoints
- Some API responses are camelCase while older UI code uses snake_case
- Need to normalize data at module boundaries consistently
- No API versioning strategy

**Frontend State Management:**
- No global state management (Redux, Zustand, etc.)
- All state is component-level or Context-based
- Potential prop drilling in complex components
- No state persistence strategy (except auth tokens)
- No offline support or data synchronization

**Dashboard Completeness:**
- Some Transport Manager dashboard tabs are more complete than others
- Verify API wiring before relying on a view operationally
- Some tabs may be UI-only without backend integration
- Some fleet and route endpoints currently do not apply route-level auth guards
- Add authorization before exposing production deployments broadly

**Real-time Features:**
- No WebSocket support for real-time updates
- No push notifications
- No live tracking for vehicles
- No real-time chat for staff communication
- Polling is used instead of push updates

**Documentation:**
- `frontend/README.md` still contains Vite starter text
- This root README is the main project guide
- No API documentation generator (Swagger/OpenAPI)
- No component documentation (Storybook)
- Limited inline code comments

**Performance Monitoring:**
- No APM (Application Performance Monitoring) integration
- No error tracking (Sentry, Rollbar)
- No performance metrics collection
- No user analytics
- No uptime monitoring

**Internationalization:**
- No i18n support (internationalization)
- No multi-language support
- Hardcoded strings throughout the application
- No timezone handling beyond application config

**Accessibility:**
- Limited ARIA labels
- No keyboard navigation testing
- No screen reader optimization
- No color contrast verification
- No WCAG compliance testing

### Technical Debt

**Code Quality:**
- Some components are large and should be split
- Repeated code patterns should be extracted to utilities
- Inconsistent naming conventions in some areas
- Some unused imports and variables
- Missing TypeScript types in some legacy code

**Dependencies:**
- Some dependencies may be outdated
- Regular dependency audits needed
- Security vulnerabilities may exist in older packages
- No automated dependency update strategy

**Error Handling:**
- Inconsistent error messages to users
- Some errors are logged but not reported to users
- No error boundary components in React
- Limited retry logic for failed requests

**Validation:**
- Client-side validation is inconsistent
- Server-side validation is not comprehensive
- No form validation library integration
- Custom validation logic scattered across components

### Maintenance Priorities

**High Priority:**
1. Set up automated testing framework (Jest for unit tests, Playwright for E2E)
2. Implement formal migration system (Knex.js or similar)
3. Add comprehensive error tracking (Sentry)
4. Implement API versioning strategy
5. Add authentication guards to all sensitive endpoints
6. Normalize API response formats (all camelCase or all snake_case)

**Medium Priority:**
1. Consolidate API client usage to shared lib/api.ts
2. Implement global state management where needed
3. Add performance monitoring (APM)
4. Set up CI/CD pipeline
5. Add comprehensive logging strategy
6. Implement WebSocket for real-time features
7. Add comprehensive API documentation (Swagger)

**Low Priority:**
1. Add i18n support for multiple languages
2. Implement offline support with service workers
3. Add accessibility improvements
4. Set up component documentation (Storybook)
5. Implement advanced analytics
6. Add dark mode support
7. Optimize bundle size further

### Upcoming Features

**Planned Enhancements:**
- GPS tracking for vehicles
- Parent mobile app
- Automated route optimization
- Fuel consumption analytics
- Maintenance scheduling automation
- Driver performance tracking
- Automated notifications (SMS, email, push)
- Financial reporting and invoicing
- Advanced reporting dashboards
- API for third-party integrations

**Infrastructure Improvements:**
- Load balancing for high availability
- Database read replicas
- CDN for static assets
- Automated backups with point-in-time recovery
- Container orchestration (Kubernetes)
- Infrastructure as Code (Terraform)
- Monitoring and alerting (Prometheus, Grafana)
- Log aggregation (ELK stack)

### Migration Strategy

**When addressing these gaps:**

1. **Testing Migration:**
   - Start with critical path testing (auth, core operations)
   - Implement Jest for unit tests
   - Add Playwright for E2E tests
   - Set up test coverage reporting
   - Integrate tests into CI/CD pipeline

2. **Migration System:**
   - Evaluate Knex.js or similar migration tool
   - Create initial migration from current schema
   - Document migration process
   - Test migrations on staging environment
   - Plan rollback procedures

3. **API Normalization:**
   - Decide on camelCase vs snake_case standard
   - Create API versioning strategy
   - Update all endpoints to follow standard
   - Update frontend to handle new format
   - Deprecate old format gracefully

4. **State Management:**
   - Evaluate Redux Toolkit or Zustand
   - Identify global state needs
   - Implement incrementally
   - Migrate component state to global where appropriate
   - Test thoroughly before deploying

### Code Review Guidelines

**When reviewing code changes:**

1. **Check for:**
   - TypeScript types are defined
   - Error handling is present
   - Validation is implemented
   - Authentication/authorization is checked
   - SQL injection prevention
   - XSS prevention
   - Unused code removal
   - Consistent naming
   - Proper error messages
   - Documentation for complex logic

2. **Ask:**
   - Does this follow existing patterns?
   - Is this tested?
   - Are there security implications?
   - Is this performant?
   - Is this maintainable?
   - Does this need documentation?

3. **Verify:**
   - No hardcoded credentials
   - No console.log statements in production
   - No commented-out code
   - No TODO comments without follow-up
   - No large functions (split if >50 lines)
   - No complex nesting (max 3 levels)

## Security Notes

### Authentication Security

**Password Security:**
- Passwords are hashed using bcrypt with 10 salt rounds
- Never store plain text passwords in the database
- Enforce strong password requirements (8+ characters, mixed case, numbers, special characters)
- Implement rate limiting on login attempts to prevent brute force attacks
- Use secure password reset flows with time-limited tokens
- Log all authentication attempts for security monitoring

**Token Security:**
- Use strong, randomly generated secrets for JWT signing (minimum 32 characters)
- Use different secrets for access tokens and refresh tokens
- Access tokens should be short-lived (8 hours or less)
- Refresh tokens should be longer-lived (7-30 days)
- Store JWT secrets in environment variables, never in code
- Rotate JWT secrets periodically in production
- Implement token blacklisting for logout if needed
- Set appropriate cookie flags (HttpOnly, Secure, SameSite)

**Token Storage:**
- Access tokens stored in localStorage (client-side)
- Refresh tokens stored in HTTP-only cookies (server-side)
- Never store tokens in URL parameters
- Clear tokens on logout
- Implement token refresh before expiration

### Authorization Security

**Role-Based Access Control:**
- All protected endpoints use authorization middleware
- Verify user role before allowing access
- Implement principle of least privilege
- Regularly audit role assignments
- Document role permissions clearly
- No hardcoded role checks in components

**Route Protection:**
- Frontend routes protected with ProtectedRoute component
- Backend routes protected with authenticate and authorize middleware
- Always verify authorization on backend (never trust frontend)
- Implement role checks on backend for all sensitive operations
- Log all authorization failures

### Data Security

**SQL Injection Prevention:**
- Always use parameterized queries
- Never concatenate user input into SQL queries
- Use prepared statements via mysql2
- Validate and sanitize all user input
- Use ORM or query builder if appropriate
- Regularly audit database queries

**XSS Prevention:**
- Sanitize user input before rendering
- Use React's built-in XSS protection (automatic escaping)
- Validate file uploads (type, size, content)
- Implement Content Security Policy (CSP)
- Sanitize data from external sources
- Avoid using dangerouslySetInnerHTML

**CSRF Prevention:**
- Use CSRF tokens for state-changing operations
- Implement SameSite cookie attribute
- Verify Origin and Referer headers
- Use double-submit cookie pattern if needed

**File Upload Security:**
- Validate file type (MIME type and extension)
- Limit file size (max 5-10MB)
- Scan uploaded files for malware
- Store files outside web root or use cloud storage
- Generate random filenames
- Never execute uploaded files
- Implement virus scanning in production

### API Security

**Rate Limiting:**
- Implement rate limiting on public endpoints
- Use IP-based rate limiting
- Implement exponential backoff for repeated failures
- Log rate limit violations
- Consider CAPTCHA for sensitive operations

**Input Validation:**
- Validate all input on both client and server
- Use express-validator for request validation
- Sanitize all user input
- Validate data types, lengths, and formats
- Reject invalid requests with clear error messages
- Never trust client-side validation alone

**Security Headers:**
- Use Helmet.js for security headers
- Implement HSTS (HTTP Strict Transport Security)
- Set X-Frame-Options to prevent clickjacking
- Set X-Content-Type-Options to prevent MIME sniffing
- Set X-XSS-Protection for XSS protection
- Implement Content Security Policy (CSP)
- Set Referrer-Policy appropriately

**CORS Configuration:**
- Configure CORS properly for frontend origin
- Don't use wildcard (*) in production
- Specify allowed methods explicitly
- Specify allowed headers explicitly
- Implement preflight caching appropriately

### Infrastructure Security

**Environment Variables:**
- Never commit .env files to version control
- Use .env.example as template
- Use strong, randomly generated secrets
- Rotate secrets periodically
- Use different secrets for different environments
- Encrypt secrets at rest in production
- Use secret management service in production (AWS Secrets Manager, etc.)

**Database Security:**
- Use strong database passwords
- Limit database user permissions (principle of least privilege)
- Don't use root user in production
- Enable SSL/TLS for database connections
- Regularly backup database
- Encrypt sensitive data at rest
- Implement database access logging
- Regularly audit database users and permissions

**Server Security:**
- Keep server OS updated
- Use firewall to restrict access
- Disable unused ports and services
- Use SSH key authentication (disable password auth)
- Implement fail2ban for SSH protection
- Regular security updates
- Monitor server logs for suspicious activity
- Implement intrusion detection system

**SSL/TLS:**
- Use HTTPS in production (never HTTP)
- Use strong SSL/TLS configuration
- Use TLS 1.2 or higher
- Use strong cipher suites
- Implement certificate auto-renewal (Let's Encrypt)
- Redirect HTTP to HTTPS
- Use HSTS to enforce HTTPS
- Regularly check SSL configuration (SSL Labs)

### Privacy and Compliance

**Data Protection:**
- Minimize data collection
- Implement data retention policies
- Provide data export functionality
- Implement data deletion requests
- Anonymize data where possible
- Implement right to be forgotten
- Document data processing activities

**Logging Security:**
- Don't log sensitive data (passwords, tokens, PII)
- Implement log rotation
- Secure log files (appropriate permissions)
- Regularly review logs for security issues
- Implement log aggregation and monitoring
- Protect logs from unauthorized access

**Compliance:**
- Understand and comply with GDPR (if applicable)
- Understand and comply with local data protection laws
- Implement data breach notification procedures
- Regularly audit security practices
- Document security policies and procedures
- Conduct regular security assessments

### Security Best Practices

**Development:**
- Never hardcode credentials or secrets
- Use environment variables for all configuration
- Implement security in code reviews
- Use security linters (ESLint security plugins)
- Regularly update dependencies
- Use npm audit to check for vulnerabilities
- Review pull requests for security issues

**Deployment:**
- Use different environments (dev, staging, prod)
- Never use production secrets in development
- Implement secure deployment pipeline
- Use secrets management in production
- Enable security monitoring in production
- Implement incident response procedures
- Regularly backup data and configurations

**Monitoring:**
- Monitor for suspicious activity
- Set up alerts for security events
- Monitor failed authentication attempts
- Monitor for unusual API usage patterns
- Monitor file upload activity
- Regularly review access logs
- Implement anomaly detection

**Incident Response:**
- Have incident response plan documented
- Train team on incident response procedures
- Have communication plan for security incidents
- Implement post-incident review process
- Learn from security incidents
- Document all security incidents
- Regularly test incident response procedures

### Security Checklist

**Before Production Deployment:**
- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable security headers (Helmet)
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure backups
- [ ] Review and test deployment process
- [ ] Conduct security audit
- [ ] Review user permissions
- [ ] Test authentication and authorization
- [ ] Review environment variables
- [ ] Check for hardcoded secrets
- [ ] Update all dependencies
- [ ] Run security vulnerability scan
- [ ] Configure logging and monitoring
- [ ] Document security procedures
- [ ] Train team on security best practices

**Regular Security Tasks:**
- [ ] Update dependencies monthly
- [ ] Review and rotate secrets quarterly
- [ ] Conduct security audit annually
- [ ] Review access logs weekly
- [ ] Monitor for security incidents daily
- [ ] Update SSL certificates before expiration
- [ ] Review user permissions monthly
- [ ] Test backup restoration quarterly
- [ ] Review security policies annually
- [ ] Conduct security training quarterly

### Resources

**Security Tools:**
- npm audit - Check for vulnerable dependencies
- Snyk - Vulnerability scanning
- OWASP ZAP - Web application security scanner
- SSL Labs - SSL/TLS configuration tester
- GitHub Dependabot - Automated dependency updates

**Security Documentation:**
- OWASP Top 10 - Most critical web application security risks
- OWASP Cheat Sheet Series - Security best practices
- CWE/SANS Top 25 - Most dangerous software errors
- NIST Cybersecurity Framework - Security guidelines

**Security Communities:**
- OWASP - Open Web Application Security Project
- SANS Institute - Security training and research
- CERT/CC - Computer Emergency Response Team
- Security Stack Exchange - Q&A for security professionals

## Additional Documentation

- Architecture notes: `docs/architecture/ARCHITECTURE.md`
- Deployment guide: `docs/deployment/DEPLOYMENT.md`
- Security policy: `SECURITY.md`
Health check:
- `GET /health`

## Documentation
- Architecture: `docs/architecture/ARCHITECTURE.md`
- Deployment: `docs/deployment/DEPLOYMENT.md`
- Postman collection: `docs/postman/Soho-Transport-API.postman_collection.json`
- Postman environment: `docs/postman/Soho-Transport-Local.postman_environment.json`
