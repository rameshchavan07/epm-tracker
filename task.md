# EPM Tracker Project Task Checklist

## 1. Native Android Mobile App (`android-app`)

- `[x]` **Project Initialization & Scaffolding**
  - `[x]` Create root Gradle build files (`settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`)
  - `[x]` Create app module build configuration (`app/build.gradle.kts`) with Room, Navigation & KSP dependencies
  - `[x]` Setup `AndroidManifest.xml` (Permissions, Service registration, WorkManager)
  - `[x]` Create `MainActivity.kt` with Jetpack Compose navigation graph
- `[x]` **Data Layer & Session Management**
  - `[x]` Create `SessionManager` for encrypted JWT and User UUID storage (`EncryptedSharedPreferences`)
  - `[x]` Setup Retrofit `ApiClient` (`http://10.0.2.2:3000/`) and `ApiService` data classes (`LoginRequest`, `LocationBatchRequest`, `LoginResponse`)
  - `[x]` Setup Room database (`AppDatabase`, `LocationEntity`, `LocationDao`) for local offline location caching
- `[x]` **Background Services & Processing**
  - `[x]` Create `TrackingService` (Android Foreground Service with notification for continuous location tracking)
  - `[x]` Create `SyncWorker` (WorkManager task for background batch sync of offline Room location logs)
  - `[x]` Immediate sync triggers on Start/Stop tracking button clicks and network reconnection events
  - `[x]` Removed 5-second hardcoded testing interval override to use dynamic tracking frequency
- `[x]` **User Interface Modernization (Jetpack Compose)**
  - `[x]` Build `LoginScreen` with dark space gradient background, brand badge, and rounded Material 3 fields
  - `[x]` Build `DashboardScreen` updated title to **"Field Agent"** and live User ID display (`User: USR-XXXXX`)
  - `[x]` Build `PermissionScreen` for location permissions request

---

## 2. NestJS Backend API & Database (`backend`)

- `[x]` **Project Scaffolding & Configuration**
  - `[x]` Scaffold NestJS TypeScript application
  - `[x]` Configure `backend/.env` (`DATABASE_URL` pointing to **Neon Cloud PostgreSQL**, `JWT_SECRET`)
  - `[x]` Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`, `@nestjs/websockets`, `socket.io`
- `[x]` **Database Schema Optimization & Normalization (Prisma ORM)**
  - `[x]` Defined Prisma schema (`WebUser`, `MobileUser`, `LocationLog`)
  - `[x]` **Model Clean-up**: Deprecated and removed redundant `Company` table
  - `[x]` **Primary Key Refactoring**: Set `deviceId` as `@id` on `MobileUser` and dropped duplicate `id` UUID column
  - `[x]` **Data Normalization**: Dropped duplicate/cached fields (`latitude`, `longitude`, `lastLocationAt`) from `MobileUser`
  - `[x]` **Log Optimization**: Removed unused `speed` and `batteryLevel` columns and redundant `mobileUserId` column from `LocationLog`
  - `[x]` Synchronized schema with Neon PostgreSQL (`npx prisma db push --accept-data-loss`)
  - `[x]` Updated seed script (`prisma/seed.ts`) with normalized schema structures
- `[x]` **Complete API Endpoint Suite**
  - `[x]` **Auth Module (`/api/v1/auth`)**: `POST /login`, `POST /register`, `GET /me`
  - `[x]` **Users Module (`/api/v1/users`)**: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
  - `[x]` **Tracking Module (`/api/v1/tracking`)**: `POST /location`, `POST /location/batch`, `GET /latest`, `GET /history/:userId`, `GET /analytics`, `GET /config`
  - `[x]` **Mobile Users Module (`/api/v1/mobile-users`)**: Device registration and management API using `deviceId` PK
- `[x]` **WebSockets Real-Time Live Gateway**
  - `[x]` Create `TrackingGateway` (`tracking.gateway.ts`) for Socket.io WebSocket streaming
  - `[x]` Broadcast `locationUpdate` events from `TrackingService` on incoming location pings
- `[x]` **Validation & Code Quality**
  - `[x]` Add request DTO validation and enable global NestJS `ValidationPipe`
  - `[x]` Verified zero TypeScript compilation errors in backend watcher

---

## 3. Web Dashboard (`web-dashboard`)

- `[x]` **Scaffolding & Design System**
  - `[x]` Scaffold Vite + React 19 + TypeScript application
  - `[x]` Create glassmorphism Vanilla CSS design system (`index.css`) with custom scrollbars and dark mode theme
  - `[x]` Setup global navigation sidebar and router layout (`Layout.tsx`, `App.tsx`)
- `[x]` **Pages & Advanced Features**
  - `[x]` `Login.tsx`: Admin & Manager authentication page
  - `[x]` `Overview.tsx`: Analytics overview with metric cards, Recharts charts, and **Export CSV Report** button
  - `[x]` `LiveMap.tsx`: OpenStreetMap Leaflet integration with Socket.io real-time live location listener
  - `[x]` **Interactive Calendar Date Picker**: Native `showPicker()` click trigger with dark mode `colorScheme: dark` styling for instant route playback filtering by date
  - `[x]` **Route Playback & Breadcrumb History**: Interactive map path rendering with dashed Polyline, circle stop markers, and timeline scrubber controls
  - `[x]` **Field Worker Travel Tracking & Metrics Summary**:
    - `[x]` Haversine distance calculator (`travelMetrics.ts`) for total kilometers traveled
    - `[x]` Travel duration calculation (hours & minutes) and visited stop locations counter
    - `[x]` Floating map telemetry overlay banner
  - `[x]` `Employees.tsx`: Mobile tracking devices table with **User ID** (`USR-1001`), **Device Hardware ID**, dynamic last ping calculation, status badges, and location history modal
- `[x]` **Verification & Build**
  - `[x]` Verify clean Vite bundle compilation (`npm run build`)
  - `[x]` Dev server active on `http://localhost:5173/`
