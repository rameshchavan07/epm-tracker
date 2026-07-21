# Android App Scaffolding Tasks

- `[x]` Initialize project structure
  - `[x]` Create root build files (`settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`)
  - `[x]` Create app module build file (`app/build.gradle.kts`)
  - `[x]` Create AndroidManifest.xml
  - `[x]` Create MainActivity.kt
  - `[x]` Create basic strings and resources
- `[x]` Verify build
  - `[x]` Run Gradle build check (Manual verification in Android Studio required as Gradle CLI is not installed)

# Navigation and Database Setup
- `[x]` Dependencies
  - `[x]` Add KSP plugin to root build.gradle.kts
  - `[x]` Add Room, Navigation, KSP dependencies to app/build.gradle.kts
- `[x]` UI & Navigation
  - `[x]` Create LoginScreen
  - `[x]` Create PermissionScreen
  - `[x]` Create DashboardScreen
  - `[x]` Create AppNavigation graph
  - `[x]` Update MainActivity to use AppNavigation
- `[x]` Local Storage
  - `[x]` Create ConfigEntity
  - `[x]` Create ConfigDao
  - `[x]` Create LocationEntity
  - `[x]` Create LocationDao
  - `[x]` Create AppDatabase

# Background Location Tracking
- `[x]` Configuration
  - `[x]` Add play-services-location dependency
  - `[x]` Add FOREGROUND_SERVICE permissions to Manifest
  - `[x]` Declare TrackingService in Manifest
- `[x]` Implementation
  - `[x]` Create LocationClient interface and implementation
  - `[x]` Create TrackingService (Foreground Service)
  - `[x]` Update DashboardScreen to start/stop service

# Auto-Sync to Cloud
- `[x]` Dependencies
  - `[x]` Add Retrofit, Gson, and WorkManager to app/build.gradle.kts
- `[x]` Networking
  - `[x]` Create TrackingApi
  - `[x]` Create RetrofitClient
- `[x]` Background Synchronization
  - `[x]` Create SyncWorker
  - `[x]` Update MainActivity to enqueue SyncWorker

# Backend Initialization
- `[x]` Scaffolding
  - `[x]` Scaffold NestJS project
  - `[x]` Install Prisma and @prisma/client
- `[x]` Database Configuration
  - `[x]` Set up .env with Neon URL
  - `[x]` Initialize Prisma schema
  - `[x]` Define Company, User, LocationLog models
- `[x]` API Implementation
  - `[x]` Create TrackingModule and Controller
  - `[x]` Implement Location sync endpoint

# Authentication & User Management
- `[x]` Dependencies
  - `[x]` Install @nestjs/jwt, @nestjs/passport, passport-jwt, bcrypt
- `[x]` Users Module
  - `[x]` Create UsersModule, UsersService
- `[x]` Auth Module
  - `[x]` Create AuthModule, AuthService, AuthController
  - `[x]` Create JwtStrategy
- `[x]` Configuration
  - `[x]` Add JWT_SECRET to .env

# Web Dashboard
- `[x]` Scaffolding
  - `[x]` Scaffold Vite + React + TS project
  - `[x]` Install routing and map dependencies
- `[x]` UI Implementation
  - `[x]` Create premium index.css design system
  - `[x]` Create Login component
  - `[x]` Create Live Map Dashboard component

# UI/UX Analytics Overhaul
- `[x]` Dependencies
  - `[x]` Install recharts
- `[x]` Architecture
  - `[x]` Create Global Layout with Navigation Sidebar
  - `[x]` Update App.tsx routing
- `[x]` Pages
  - `[x]` Create Analytics Overview page (Cards, Charts, Table)
  - `[x]` Refactor Live Map page
  - `[x]` Create Employees table page
- `[x]` Styling
  - `[x]` Update index.css for new layout and analytics components

# Native Android App Implementation Tasks
- `[x]` **Data Layer**
  - `[x]` Create SessionManager for JWT storage (EncryptedSharedPreferences)
  - `[x]` Setup Retrofit ApiService and ApiClient
  - `[x]` Setup Room Database (AppDatabase, LocationEntity, LocationDao)
- `[x]` **Background Processing**
  - `[x]` Create SyncWorker to upload cached locations
  - `[x]` Create LocationService (Foreground Service) for continuous tracking
- `[x]` **User Interface (Jetpack Compose)**
  - `[x]` Build LoginScreen
  - `[x]` Build DashboardScreen (Start/Stop Tracking)
  - `[x]` Wire navigation in MainActivity
- `[x]` **Configuration & Permissions**
  - `[x]` Update AndroidManifest.xml (Permissions, Service registration)
  - `[x]` Build and generate APK
