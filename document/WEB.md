# WEB.md

# Employee Tracking SaaS - Web Dashboard

## Overview

The web dashboard is the primary interface used by Company Admins,
Managers, and Super Admins to monitor employees, manage companies,
configure tracking policies, and generate reports.

------------------------------------------------------------------------

# Objectives

-   Monitor employees in real time
-   Replay travel routes
-   View attendance and reports
-   Manage employees and departments
-   Configure company tracking settings
-   Support multi-tenant SaaS

------------------------------------------------------------------------

# Technology Stack

-   React
-   TypeScript
-   Vite
-   Tailwind CSS
-   TanStack Query
-   React Router
-   Google Maps JavaScript API
-   Socket.IO Client
-   Recharts
-   Axios

------------------------------------------------------------------------

# Folder Structure

``` text
src/
├── api/
├── assets/
├── components/
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── employees/
│   ├── tracking/
│   ├── reports/
│   ├── attendance/
│   ├── geofences/
│   ├── settings/
│   └── subscriptions/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── types/
└── utils/
```

------------------------------------------------------------------------

# User Roles

## Super Admin

-   Manage companies
-   Manage subscriptions
-   View platform analytics
-   Monitor system health

## Company Admin

-   Manage employees
-   Configure tracking policies
-   Create geofences
-   View reports

## Manager

-   Track assigned employees
-   Monitor attendance
-   Review route history
-   Receive alerts

------------------------------------------------------------------------

# Main Modules

## Authentication

-   Login
-   Forgot Password
-   Token Refresh
-   Role-Based Access

## Dashboard

-   KPIs
-   Employee summary
-   Live activity
-   Recent alerts

## Live Tracking

-   Google Maps integration
-   Live employee markers
-   Online/offline status
-   Route polylines

## Employee Management

-   Add/Edit/Delete employees
-   Department management
-   Shift assignment

## Route Replay

-   Select employee
-   Select date
-   Replay route with timeline
-   Stop detection

## Attendance

-   Daily attendance
-   Check-in/out history
-   Working hours

## Reports

-   Daily
-   Weekly
-   Monthly
-   Distance traveled
-   Idle time
-   Export (CSV/PDF)

## Geofence Management

-   Create geofences
-   Edit radius
-   Entry/exit events

## Company Settings

-   Tracking mode
-   Tracking interval
-   Working hours
-   Notification preferences

## Subscription Management

-   Plan details
-   Billing status
-   Employee limits

------------------------------------------------------------------------

# Real-Time Updates

The dashboard connects to the backend using WebSockets.

``` text
Employee App
      ↓
Tracking Service
      ↓
Socket.IO
      ↓
React Dashboard
      ↓
Map Updates
```

------------------------------------------------------------------------

# State Management

Recommended: - TanStack Query for server state - React Context or
Zustand for UI state

------------------------------------------------------------------------

# Security

-   JWT Authentication
-   Role-Based Access Control (RBAC)
-   Tenant isolation
-   Secure API communication over HTTPS

------------------------------------------------------------------------

# Performance

-   Lazy-loaded routes
-   Code splitting
-   Pagination
-   Virtualized tables
-   Cached API responses
-   Optimized map rendering

------------------------------------------------------------------------

# Testing

-   Unit tests
-   Component tests
-   End-to-end tests
-   API integration tests

------------------------------------------------------------------------

# Related Documents

-   README.md
-   ARCHITECTURE.md
-   DATABASE.md
-   API.md
-   ANDROID.md
-   SECURITY.md
-   DEPLOYMENT.md
-   ROADMAP.md
