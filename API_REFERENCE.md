# API Reference Guide - Fuel & Maintenance Endpoints

## Overview
Complete API reference for the fuel and maintenance request management system with dynamic confirmation workflow.

## Base URL
```
http://localhost:5000/api/fuel-maintenance
```

## Authentication
All endpoints require:
- Header: `Authorization: Bearer <JWT_TOKEN>`
- Content-Type: `application/json`

## Endpoints

### 1. Create Fuel/Maintenance Request
**Method:** `POST /requests`

**Authorization:** Driver, Bus Assistant

**Description:** Create a new fuel or maintenance request for a vehicle.

**Request Body:**
```json
{
  "requestDate": "2026-05-18",
  "requestTime": "10:30:00",
  "numberPlate": "ABC123",
  "currentMileage": 45000,
  "requestType": "Fuel",
  "category": "Fuels & Oils",
  "description": "Regular fuel top-up, engine seems slightly louder than usual",
  "amount": 150.00
}
```

**Request Type Options:**
- `Fuel`
- `Service`
- `Repair and Maintenance`
- `Compliance`

**Category Options:**
- `Fuels & Oils`
- `Body Works and Body Parts`
- `Mechanical`
- `Wiring`
- `Puncture & Tires`
- `Insurance`
- `RSL`
- `Inspection / Speed Governors`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Fuel and maintenance request created successfully.",
  "data": {
    "request": {
      "id": 123,
      "requestDate": "2026-05-18",
      "requestTime": "10:30:00",
      "numberPlate": "ABC123",
      "currentMileage": 45000,
      "requestType": "Fuel",
      "requestedBy": "John Driver",
      "category": "Fuels & Oils",
      "description": "Regular fuel top-up...",
      "amount": 150.00,
      "confirmedBy": "",
      "confirmedByUserId": null,
      "confirmationStatus": "PENDING",
      "confirmedAt": null,
      "createdByUserId": 1,
      "createdAt": "2026-05-18T10:30:00.000Z",
      "updatedAt": "2026-05-18T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- 400: Invalid request type, time, category, or missing amount for Fuel requests
- 403: Driver trying to submit for a vehicle not assigned to them
- 404: Vehicle (number plate) not found or not active
- 500: Server error

---

### 2. Get Driver's Requests
**Method:** `GET /requests`

**Authorization:** Driver, Bus Assistant, Transport Manager

**Description:** Retrieve all fuel/maintenance requests created by the authenticated user.

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Fuel and maintenance requests retrieved successfully.",
  "data": {
    "requests": [
      {
        "id": 123,
        "requestDate": "2026-05-18",
        "requestTime": "10:30:00",
        "numberPlate": "ABC123",
        "currentMileage": 45000,
        "requestType": "Fuel",
        "requestedBy": "John Driver",
        "category": "Fuels & Oils",
        "description": "Regular fuel top-up",
        "amount": 150.00,
        "confirmedBy": "Manager Name",
        "confirmedByUserId": 5,
        "confirmedByName": "Manager Name",
        "confirmationStatus": "CONFIRMED",
        "confirmedAt": "2026-05-18T11:00:00.000Z",
        "createdByUserId": 1,
        "createdAt": "2026-05-18T10:30:00.000Z",
        "updatedAt": "2026-05-18T11:00:00.000Z"
      }
    ]
  }
}
```

---

### 3. Get All Requests (Transport Manager)
**Method:** `GET /all`

**Authorization:** Transport Manager

**Description:** Retrieve all fuel/maintenance requests in the system with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by confirmation status - `PENDING`, `CONFIRMED`, `REJECTED`
- `numberPlate` (optional): Filter by vehicle plate
- `limit` (optional): Max results (default: 100, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```
GET /all?status=PENDING&numberPlate=ABC123&limit=50&offset=0
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "All fuel and maintenance requests retrieved successfully.",
  "data": {
    "requests": [
      {
        "id": 123,
        "requestDate": "2026-05-18",
        "requestTime": "10:30:00",
        "numberPlate": "ABC123",
        "currentMileage": 45000,
        "requestType": "Fuel",
        "requestedBy": "John Driver",
        "requestedByName": "John Driver",
        "category": "Fuels & Oils",
        "description": "Regular fuel top-up",
        "amount": 150.00,
        "confirmedBy": null,
        "confirmedByUserId": null,
        "confirmedByName": "Unconfirmed",
        "confirmationStatus": "PENDING",
        "confirmedAt": null,
        "createdByUserId": 1,
        "createdAt": "2026-05-18T10:30:00.000Z",
        "updatedAt": "2026-05-18T10:30:00.000Z"
      }
    ]
  }
}
```

---

### 4. Confirm/Reject Request
**Method:** `POST /:requestId/confirm`

**Authorization:** Transport Manager

**Description:** Confirm or reject a fuel/maintenance request with full audit logging.

**URL Parameter:**
- `requestId` (required): The ID of the request to confirm

**Request Body:**
```json
{
  "confirmationStatus": "CONFIRMED"
}
```

**Confirmation Status Options:**
- `CONFIRMED` - Approve the request
- `REJECTED` - Decline the request

**Success Response (200):**
```json
{
  "success": true,
  "message": "Fuel and maintenance request confirmed successfully.",
  "data": {
    "request": {
      "id": 123,
      "requestDate": "2026-05-18",
      "requestTime": "10:30:00",
      "numberPlate": "ABC123",
      "currentMileage": 45000,
      "requestType": "Fuel",
      "requestedBy": "John Driver",
      "category": "Fuels & Oils",
      "description": "Regular fuel top-up",
      "amount": 150.00,
      "confirmedBy": null,
      "confirmedByUserId": 5,
      "confirmedByName": "Transport Manager",
      "confirmationStatus": "CONFIRMED",
      "confirmedAt": "2026-05-18T11:00:00.000Z",
      "createdByUserId": 1,
      "createdAt": "2026-05-18T10:30:00.000Z",
      "updatedAt": "2026-05-18T11:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- 400: Missing or invalid confirmation status
- 403: User is not a Transport Manager
- 404: Request not found
- 500: Server error

---

## Error Codes & Messages

| Code | Message | Cause |
|------|---------|-------|
| `NUMBER_PLATE_NOT_FOUND` | Selected number plate is not available | Vehicle not found or inactive |
| `AMOUNT_REQUIRED_FOR_FUEL` | amount is required when requestType is Fuel | Fuel request without amount |
| `INVALID_AMOUNT_FOR_FUEL` | amount must be greater than zero | Amount <= 0 |
| `DRIVER_NUMBER_PLATE_NOT_ASSIGNED` | No number plate is assigned to this driver | Driver account has no vehicle |
| `DRIVER_NUMBER_PLATE_MISMATCH` | Drivers can only submit for assigned plate | Driver trying to submit for wrong vehicle |
| `INVALID_REQUEST_TYPE` | Invalid request type | Unsupported request type |
| `INVALID_REQUEST_TIME` | Invalid request time | Time format incorrect |
| `INVALID_REQUEST_CATEGORY` | Invalid request category | Unsupported category |
| `REQUEST_NOT_FOUND` | Fuel maintenance request not found | Confirmation on non-existent request |
| `INVALID_CONFIRMATION_STATUS` | Invalid confirmation status | Use CONFIRMED or REJECTED |
| `UNAUTHORIZED_CONFIRMATION` | Only Transport Managers can confirm | Non-manager trying to confirm |

---

## cURL Examples

### Create a Request
```bash
curl -X POST http://localhost:5000/api/fuel-maintenance/requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requestDate": "2026-05-18",
    "requestTime": "10:30:00",
    "numberPlate": "ABC123",
    "currentMileage": 45000,
    "requestType": "Fuel",
    "category": "Fuels & Oils",
    "description": "Regular fuel top-up",
    "amount": 150.00
  }'
```

### Get All Pending Requests
```bash
curl http://localhost:5000/api/fuel-maintenance/all?status=PENDING \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Confirm a Request
```bash
curl -X POST http://localhost:5000/api/fuel-maintenance/123/confirm \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmationStatus": "CONFIRMED"
  }'
```

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success - Operation completed |
| 201 | Created - New request created successfully |
| 400 | Bad Request - Invalid input parameters |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal server error |

---

## Data Types & Formats

### Date Format
- Format: `YYYY-MM-DD` (ISO 8601)
- Example: `2026-05-18`

### Time Format
- Format: `HH:MM:SS` (24-hour)
- Example: `10:30:00`

### DateTime Format
- Format: ISO 8601 with timezone
- Example: `2026-05-18T10:30:00.000Z`

### Amount Format
- Type: Decimal number
- Precision: 2 decimal places
- Example: `150.00`

---

## Audit Trail Integration

Every confirmation is automatically logged to the `audit_logs` table:

```sql
SELECT * FROM audit_logs 
WHERE domain = 'fuel_maintenance' 
  AND entityType = 'FuelMaintenanceRequest'
  AND entityId = 123;
```

**Audit Log Fields:**
- `actorUserId` - Transport Manager who performed action
- `domain` - Always "fuel_maintenance"
- `entityType` - Always "FuelMaintenanceRequest"
- `entityId` - Request ID
- `action` - "CONFIRMED_CONFIRMED" or "CONFIRMED_REJECTED"
- `previousStateJson` - State before confirmation
- `newStateJson` - State after confirmation
- `createdAt` - When action occurred

---

## Rate Limiting

No rate limiting is currently implemented. For production, consider:
- Rate limiting per user/IP
- Request throttling for bulk operations
- Caching for frequently accessed data

---

## Pagination

For endpoints supporting pagination:
- Default limit: 100
- Maximum limit: 200
- Use offset for additional pages

```
GET /all?limit=50&offset=100  // Get items 100-149
```

---

## Versioning

Current API Version: v1

Future versions may introduce:
- Batch confirmation operations
- Advanced filtering and sorting
- Webhook notifications
- Real-time updates via WebSocket
