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
- `[x]` **User Interface Modernization (Jetpack Compose)**
  - `[x]` Build `LoginScreen` with dark space gradient background, brand badge, and rounded Material 3 fields
  - `[x]` Build `DashboardScreen` with live active tracking status badge, 2x2 telemetry metric grid, and Start/Stop toggle button
  - `[x]` Build `PermissionScreen` for location permissions request

---

## 2. NestJS Backend API & Database (`backend`)

- `[x]` **Project Scaffolding & Configuration**
  - `[x]` Scaffold NestJS TypeScript application
  - `[x]` Configure `backend/.env` (`DATABASE_URL` pointing to Neon PostgreSQL, `JWT_SECRET`)
  - `[x]` Install `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `class-validator`, `@nestjs/websockets`, `socket.io`
- `[x]` **Database & Prisma ORM**
  - `[x]` Define Prisma schema (`Company`, `User`, `LocationLog`)
  - `[x]` Reset and synchronize schema with Neon PostgreSQL (`npx prisma db push --force-reset`)
  - `[x]` Create seed script (`prisma/seed.ts`) and populate initial company (**Acme Corp**), admin user, employee accounts, and sample locations
- `[x]` **Complete API Endpoint Suite (14 Active Routes)**
  - `[x]` **Auth Module (`/api/v1/auth`)**: `POST /login`, `POST /register`, `GET /me`
  - `[x]` **Users Module (`/api/v1/users`)**: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`
  - `[x]` **Tracking Module (`/api/v1/tracking`)**: `POST /location`, `POST /location/batch`, `GET /latest`, `GET /history/:userId`, `GET /analytics`
  - `[x]` **Company Module (`/api/v1/company`)**: `GET /profile`, `PATCH /profile`
- `[x]` **WebSockets Real-Time Live Gateway**
  - `[x]` Create `TrackingGateway` (`tracking.gateway.ts`) for Socket.io WebSocket streaming
  - `[x]` Broadcast `locationUpdate` events from `TrackingService` on incoming location pings
- `[x]` **Validation & Code Quality**
  - `[x]` Add request DTO validation and enable global NestJS `ValidationPipe`
  - `[x]` Resolve all Prettier and ESLint formatting rules across backend files

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
  - `[x]` **Route Playback & Breadcrumb History**: Interactive map path rendering with dashed Polyline, circle stop markers, and timeline scrubber controls
  - `[x]` **Field Worker Travel Tracking & Metrics Summary**:
    - `[x]` Haversine distance calculator (`travelMetrics.ts`) for total kilometers traveled
    - `[x]` Travel duration calculation (hours & minutes) and visited stop locations counter
    - `[x]` Date picker input filter (`<input type="date">`) for history lookup
    - `[x]` Floating map telemetry overlay banner
  - `[x]` `Employees.tsx`: Team employee management table with **View Travel Route** button linking directly to worker maps
  - `[x]` `CompanySettings.tsx`: Connected to `GET/PATCH /company/profile` API
- `[x]` **Verification & Build**
  - `[x]` Verify clean Vite bundle compilation (`npm run build`)
  - `[x]` Dev server active on `http://localhost:5173/`
