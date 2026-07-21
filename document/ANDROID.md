# ANDROID.md

# Employee Tracking SaaS - Android Application

## Overview

The Android application is used by field employees to securely share
their location with their company. It supports background tracking,
offline synchronization, shift management, and configurable tracking
policies downloaded from the server.

------------------------------------------------------------------------

# Objectives

-   Secure employee authentication
-   Background location tracking
-   Offline-first architecture
-   Battery-efficient GPS collection
-   Real-time synchronization
-   Support multiple tracking modes

------------------------------------------------------------------------

# Technology Stack

-   Kotlin
-   Jetpack Compose
-   MVVM + Clean Architecture
-   Hilt (Dependency Injection)
-   Room Database
-   Retrofit
-   Kotlin Coroutines + Flow
-   WorkManager
-   Foreground Service
-   Google Play Services Location (Fused Location Provider)
-   Firebase Cloud Messaging

------------------------------------------------------------------------

# Project Structure

``` text
app/
├── data/
│   ├── api/
│   ├── database/
│   ├── repository/
│   └── models/
├── domain/
│   ├── usecases/
│   └── repository/
├── presentation/
│   ├── login/
│   ├── home/
│   ├── tracking/
│   ├── settings/
│   └── profile/
├── services/
├── workers/
└── utils/
```

------------------------------------------------------------------------

# App Flow

``` text
Splash
   ↓
Login
   ↓
Download Company Settings
   ↓
Request Permissions
   ↓
Home Dashboard
   ↓
Start Tracking
   ↓
Foreground Service
   ↓
Location Updates
   ↓
Offline Cache (if required)
   ↓
Sync to Server
```

------------------------------------------------------------------------

# Tracking Modes

## 1. Shift-Based

-   Employee logs in or starts a shift.
-   Foreground tracking starts.
-   Tracking stops when the shift ends or the user logs out.

## 2. Always-On

-   Tracking starts automatically after permissions are granted.
-   Runs in the background according to Android platform rules.

## 3. Scheduled

-   Tracking starts and stops automatically during configured working
    hours.

------------------------------------------------------------------------

# Required Permissions

``` xml
ACCESS_FINE_LOCATION
ACCESS_COARSE_LOCATION
ACCESS_BACKGROUND_LOCATION
FOREGROUND_SERVICE
POST_NOTIFICATIONS
INTERNET
RECEIVE_BOOT_COMPLETED (optional)
```

------------------------------------------------------------------------

# Background Tracking

Use: - Foreground Service for continuous tracking - WorkManager for
retrying failed uploads - Room Database for offline storage

Location collection cycle:

``` text
GPS
   ↓
Validate Accuracy
   ↓
Save to Room
   ↓
Upload to API
   ↓
Mark as Synced
```

------------------------------------------------------------------------

# Offline Synchronization

If the network is unavailable:

1.  Save GPS records locally.
2.  Retry uploads using WorkManager.
3.  Delete local records after successful synchronization.

------------------------------------------------------------------------

# Battery Optimization

-   Use the Fused Location Provider.
-   Adjust update intervals based on company settings.
-   Avoid unnecessary GPS requests.
-   Respect Android battery optimization policies.

------------------------------------------------------------------------

# Security

-   JWT Access Token
-   Refresh Token
-   HTTPS only
-   Encrypted local storage for sensitive data
-   Token refresh handling

------------------------------------------------------------------------

# Main Screens

-   Splash
-   Login
-   Home
-   Shift Management
-   Tracking Status
-   Route History
-   Notifications
-   Profile
-   Settings

------------------------------------------------------------------------

# Push Notifications

Examples: - Shift reminder - GPS disabled - Battery low - Geofence
alerts - Company announcements

------------------------------------------------------------------------

# Error Handling

-   No internet
-   GPS disabled
-   Permission denied
-   Authentication expired
-   Server unavailable

------------------------------------------------------------------------

# Testing

-   Unit Tests
-   ViewModel Tests
-   Repository Tests
-   UI Tests
-   Background Service Tests
-   Offline Sync Tests

------------------------------------------------------------------------

# Related Documents

-   README.md
-   ARCHITECTURE.md
-   DATABASE.md
-   API.md
-   WEB.md
-   SECURITY.md
-   DEPLOYMENT.md
-   ROADMAP.md
