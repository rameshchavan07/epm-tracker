# API.md

# Employee Tracking SaaS API Documentation

## Base URL

    https://api.yourdomain.com/api/v1

## Authentication

Authentication uses JWT access tokens and refresh tokens.

### Login

**POST** `/auth/login`

Request:

``` json
{
  "email": "employee@company.com",
  "password": "password123"
}
```

Response:

``` json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "role": "EMPLOYEE",
    "companyId": "uuid"
  }
}
```

### Refresh Token

**POST** `/auth/refresh`

### Logout

**POST** `/auth/logout`

------------------------------------------------------------------------

# Employee APIs

## List Employees

**GET** `/employees`

## Get Employee

**GET** `/employees/{id}`

## Create Employee

**POST** `/employees`

## Update Employee

**PUT** `/employees/{id}`

## Delete Employee

**DELETE** `/employees/{id}`

------------------------------------------------------------------------

# Tracking APIs

## Upload Location

**POST** `/tracking/location`

Request:

``` json
{
  "latitude": 18.5204,
  "longitude": 73.8567,
  "accuracy": 8.2,
  "speed": 12.4,
  "batteryLevel": 78,
  "activityType": "DRIVING",
  "timestamp": "2026-07-21T09:10:00Z"
}
```

Response:

``` json
{
  "success": true
}
```

## Batch Upload Locations

**POST** `/tracking/location/batch`

Used when syncing offline data.

## Live Employee Location

**GET** `/tracking/live`

## Route History

**GET** `/tracking/history`

Query Parameters:

-   employeeId
-   from
-   to

## Stop History

**GET** `/tracking/stops`

------------------------------------------------------------------------

# Attendance APIs

## Start Shift

**POST** `/attendance/start`

## End Shift

**POST** `/attendance/end`

## Attendance History

**GET** `/attendance/history`

------------------------------------------------------------------------

# Geofence APIs

## List Geofences

**GET** `/geofences`

## Create Geofence

**POST** `/geofences`

## Update Geofence

**PUT** `/geofences/{id}`

## Delete Geofence

**DELETE** `/geofences/{id}`

------------------------------------------------------------------------

# Reports

## Daily Report

**GET** `/reports/daily`

## Weekly Report

**GET** `/reports/weekly`

## Monthly Report

**GET** `/reports/monthly`

## Route Replay

**GET** `/reports/route`

------------------------------------------------------------------------

# Company APIs

## Company Profile

**GET** `/company`

## Update Tracking Settings

**PUT** `/company/tracking-settings`

Example:

``` json
{
  "trackingMode": "SHIFT",
  "trackingInterval": 30,
  "stopDuration": 5
}
```

------------------------------------------------------------------------

# Notification APIs

## List Notifications

**GET** `/notifications`

## Mark as Read

**PUT** `/notifications/{id}/read`

------------------------------------------------------------------------

# WebSocket Events

Client → Server

-   location:update

Server → Client

-   employee:location
-   employee:online
-   employee:offline
-   geofence:entered
-   geofence:exited

------------------------------------------------------------------------

# HTTP Status Codes

  Code   Meaning
  ------ -----------------------
  200    Success
  201    Created
  400    Bad Request
  401    Unauthorized
  403    Forbidden
  404    Not Found
  409    Conflict
  500    Internal Server Error

------------------------------------------------------------------------

# API Versioning

    /api/v1
    /api/v2

Future versions should remain backward compatible whenever possible.

------------------------------------------------------------------------

# Security

-   HTTPS only
-   JWT Authentication
-   Refresh Tokens
-   Tenant Isolation
-   Rate Limiting
-   Request Validation
-   Role-Based Access Control (RBAC)

------------------------------------------------------------------------

# Related Documents

-   README.md
-   ARCHITECTURE.md
-   DATABASE.md
-   SECURITY.md
