# Employee Tracking SaaS

A scalable, multi-tenant Employee Tracking System that enables companies
to monitor field employees in real time through a mobile application.
The platform supports multiple tracking modes, live location monitoring,
route history, stop detection, attendance, geofencing, and analytics.

------------------------------------------------------------------------

## Overview

This project is designed as a **Software as a Service (SaaS)** platform
where multiple companies (tenants) can use the same application while
keeping their data isolated and secure.

Each company can configure its own tracking policies, reporting
preferences, and employee management settings.

------------------------------------------------------------------------

## Key Features

### Employee Mobile App

-   Secure login
-   Background location tracking
-   Offline data synchronization
-   Shift start/end
-   GPS permission management
-   Battery optimization handling

### Web Dashboard

-   Live employee tracking
-   Route replay
-   Daily travel history
-   Stop detection
-   Attendance monitoring
-   Geofence management
-   Reports and analytics

### SaaS Administration

-   Multi-tenant architecture
-   Company management
-   Subscription plans
-   Role-based access control
-   Audit logs

------------------------------------------------------------------------

## Tracking Modes

### Shift-Based Tracking

Location tracking starts when the employee begins a shift or logs in and
stops when the shift ends or the employee logs out.

### Always-On Tracking

Location tracking begins automatically after the application is
installed and the required permissions are granted.

### Scheduled Tracking

Tracking automatically starts and stops according to company-defined
working hours.

------------------------------------------------------------------------

## User Roles

-   Super Admin
-   Company Admin
-   Manager
-   Employee

------------------------------------------------------------------------

## Technology Stack

### Mobile

-   Kotlin
-   Jetpack Compose
-   WorkManager
-   Room Database
-   Google Maps SDK

### Backend

-   Node.js
-   Express or NestJS
-   Prisma ORM
-   PostgreSQL + PostGIS
-   Redis
-   Socket.IO

### Frontend

-   React
-   TypeScript
-   Tailwind CSS

### Infrastructure

-   Docker
-   Nginx
-   AWS / Azure / DigitalOcean

------------------------------------------------------------------------

## Project Structure

``` text
employee-tracking-saas/
├── android-app/
├── backend/
├── dashboard/
├── docs/
├── infrastructure/
└── shared/
```

------------------------------------------------------------------------

## Development Roadmap

1.  Authentication & Multi-tenancy
2.  Employee Mobile Application
3.  Background Location Tracking
4.  Live Tracking Dashboard
5.  Route Replay & Stop Detection
6.  Attendance & Geofencing
7.  Reports & Analytics
8.  Notifications
9.  Subscription & Billing
10. Production Deployment

------------------------------------------------------------------------

## Documentation

-   ARCHITECTURE.md
-   DATABASE.md
-   API.md
-   ANDROID.md
-   WEB.md
-   SECURITY.md
-   DEPLOYMENT.md
-   ROADMAP.md

------------------------------------------------------------------------

## License

This project is intended as a production-ready SaaS solution for
workforce and field employee tracking.
