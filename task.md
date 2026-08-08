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
  - `[x]` Updated default interval fallback in `SessionManager` to 2 minutes (`120000ms`)
- `[x]` **Background Services & Processing**
  - `[x]` Create `TrackingService` (Android Foreground Service with notification for continuous location tracking)
  - `[x]` Create `SyncWorker` (WorkManager task for background batch sync of offline Room location logs)
  - `[x]` Immediate sync triggers on Start/Stop tracking button clicks and network reconnection events
  - `[x]` Removed 5-second hardcoded testing interval override to use dynamic tracking frequency
  - `[x]` On-device reverse geocoding via `android.location.Geocoder` to resolve place/street names in background service notifications and Room DB
  - `[x]` Record active capture interval latency (e.g. 2 min vs 10 min) with every local Room location log
  - `[x]` Implemented a timestamp throttle guard in `TrackingService.kt` to reject rapid duplicate callbacks
  - `[x]` Configured `LocationRequest.Builder` with high-accuracy satellite precision settings (`GRANULARITY_FINE`, `setWaitForAccurateLocation(true)`)
- `[x]` **User Interface Modernization (Jetpack Compose)**
  - `[x]` Build `LoginScreen` with dark space gradient background, brand badge, and rounded Material 3 fields
  - `[x]` Build `DashboardScreen` updated title to **"Field Agent"** and live User ID display (`User: USR-XXXXX`)
  - `[x]` Build `PermissionScreen` for location permissions request
- `[x]` **Build Optimization & Warning Remediation**
  - `[x]` Resolved Kotlin compiler warnings in `SyncWorker.kt` (removed unused `sessionManager` instance)
  - `[x]` Suppressed deprecated Geocoder API warnings in `TrackingService.kt`
  - `[x]` Verified clean Android build compilation (`:app:assembleDebug`)
- `[x]` **Face Recognition & Server-Verified Authentication**
  - `[x]` Created `FaceCaptureCamera` composable with CameraX integration for live face capture (Base64 JPEG output)
  - `[x]` Created `FaceAuthManager` with `enrollFaceWithServer()` and `verifyFaceWithServer()` methods
  - `[x]` Created `FaceEnrollmentScreen` with first-time face setup UI (camera capture → server enrollment → success animation)
  - `[x]` Integrated face login flow in `LoginScreen` (enrollment for new users, verification for returning users)
  - `[x]` Created `LogoutVerificationDialog` with face verification before logout
  - `[x]` Added face enrollment state persistence in `SessionManager` (`isFaceEnrolled`, `saveFaceEnrolled`)
  - `[x]` Increased network timeouts to 60s (connect: 30s, read/write: 60s) to support CPU-based face model inference

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
  - `[x]` **Log Optimization**: Removed unused `speed` and `batteryLevel` columns and added optional `address` & `intervalMinutes` columns to `LocationLog`
  - `[x]` Synchronized schema with Neon PostgreSQL (`npx prisma db push --accept-data-loss`)
  - `[x]` Updated seed script (`prisma/seed.ts`) with normalized schema structures
  - `[x]` Added `FaceProfile` model with `userId`, `deviceId`, `descriptor` (Float[128]), and `referenceImage` fields
- `[x]` **Complete API Endpoint Suite & Reverse Geocoding**
  - `[x]` **Auth Module (`/api/v1/auth`)**: `POST /login`, `POST /register`, `GET /me`, `POST /enroll-face`, `POST /verify-face`
  - `[x]` **Users Module (`/api/v1/users`)**: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
  - `[x]` **Tracking Module (`/api/v1/tracking`)**: `POST /location`, `POST /location/batch`, `GET /latest`, `GET /history/:userId`, `GET /analytics`, `GET /config`
  - `[x]` **Mobile Users Module (`/api/v1/mobile-users`)**: Device registration and management API using `deviceId` PK
  - `[x]` **Server-Side Fallback Reverse Geocoding**: Integrated OpenStreetMap Nominatim reverse geocoding fallback for missing address payloads
  - `[x]` Exposed server-configurable tracking frequency (`TRACKING_INTERVAL_MINUTES` in environment configuration and service logic)
- `[x]` **Server-Side Face Recognition (face-api.js)**
  - `[x]` Created `FaceRecognitionService` with face-api.js + node-canvas for Node.js face processing
  - `[x]` Loaded SSD MobileNet v1, Face Landmark 68, and Face Recognition neural network models from disk
  - `[x]` Implemented 128-dim face descriptor extraction from Base64 JPEG images
  - `[x]` Implemented Euclidean distance face comparison with configurable match threshold (default: 0.6)
  - `[x]` `POST /enroll-face`: Extracts face descriptor and stores in PostgreSQL `FaceProfile` table (upsert)
  - `[x]` `POST /verify-face`: Compares live face against stored profile with confidence percentage
  - `[x]` Disabled `@tensorflow/tfjs-node` native bindings (incompatible with Node v24), using JS CPU backend fallback
  - `[x]` Increased Express payload limit to 10MB for Base64 face image transfers
- `[x]` **WebSockets Real-Time Live Gateway**
  - `[x]` Create `TrackingGateway` (`tracking.gateway.ts`) for Socket.io WebSocket streaming
  - `[x]` Broadcast `locationUpdate` events with live place names and capture latency mode on incoming pings
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
  - `[x]` Resolved connection loops and high server load by correcting the `useEffect` dependency array in `LiveMap.tsx`
  - `[x]` Added human-readable location addresses to all CSV export functions (across `exportCsv.ts`, `LiveMap.tsx`, and `Employees.tsx`)
  - `[x]` **Interactive Calendar Date Picker**: Native `showPicker()` click trigger with dark mode `colorScheme: dark` styling for instant route playback filtering by date
  - `[x]` **Route Playback & Breadcrumb History**: Interactive map path rendering with dashed Polyline, circle stop markers, and timeline scrubber controls
  - `[x]` **Reverse Geocoding Address & Latency Mode Badges**:
    - `[x]` Display full human-readable addresses in map marker popups, sidebar active user card, and history playback stops
    - `[x]` Display active capture latency badges (`⚡ 2 min interval` / `⚡ 10 min interval`)
  - `[x]` **Field Worker Travel Tracking & Metrics Summary**:
    - `[x]` Haversine distance calculator (`travelMetrics.ts`) for total kilometers traveled
    - `[x]` Travel duration calculation (hours & minutes) and visited stop locations counter
    - `[x]` Floating map telemetry overlay banner
  - `[x]` `Employees.tsx`: Mobile tracking devices table with **User ID** (`USR-1001`), **Device Hardware ID**, dynamic last ping calculation, status badges, and location history modal
- `[x]` **Verification & Build**
  - `[x]` Verify clean Vite bundle compilation (`npm run build`)
  - `[x]` Dev server active on `http://localhost:5173/`

---

## 4. Infrastructure & Networking

- `[x]` **Local Development Connectivity**
  - `[x]` Updated Android `ApiClient.kt` BASE_URL to current machine IP (`172.17.47.133:3000`)
  - `[x]` Created `open-firewall.bat` script to open Windows Firewall port 3000 for phone-to-PC connectivity
  - `[x]` Resolved port 3000 `EADDRINUSE` conflicts by killing stale Node processes
  - `[x]` Verified end-to-end phone → backend connectivity (Hello World response on phone browser)

