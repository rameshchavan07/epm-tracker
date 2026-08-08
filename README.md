# 🛰️ EPM Tracker — Production Enterprise Telemetry & Field Force Tracking Platform

<p align="center">
  <img src="https://img.shields.io/badge/Backend-NestJS%2011-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Mobile-Kotlin%20Jetpack%20Compose-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white" alt="Kotlin" />
  <img src="https://img.shields.io/badge/Database-Neon%20PostgreSQL-02E0B8?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/ORM-Prisma%205.14-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Realtime-Socket.io%204.8-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
</p>

---

## 📑 Table of Contents
- [ Overview](#-overview)
- [ System Architecture](#-system-architecture)
- [ Subsystems & Core Capabilities](#-subsystems--core-capabilities)
  - [1. Native Android Application (`android-app`)](#1-native-android-application-android-app)
  - [2. NestJS Backend API & Gateway (`backend`)](#2-nestjs-backend-api--gateway-backend)
  - [3. React Web Dashboard (`web-dashboard`)](#3-react-web-dashboard-web-dashboard)
  - [4. Database & ORM (`prisma`)](#4-database--orm-prisma)
- [ Biometric Face Authentication Flow](#-biometric-face-authentication-flow)
- [ Polyline Route Smoothing (RDP Algorithm)](#-polyline-route-smoothing-rdp-algorithm)
- [ Complete REST API & WebSockets Specification](#-complete-rest-api--websockets-specification)
- [ Environment Variables Configuration](#-environment-variables-configuration)
- [ Local Development & Quick Start](#-local-development--quick-start)
- [ Physical Device Network Setup & Firewall](#-physical-device-network-setup--firewall)

---

## 📋 Overview

**EPM Tracker** is a production-grade field force telemetry, location tracking, and mobile workforce management platform designed for high-density, real-time spatial monitoring and continuous background tracking.

The project is structured into three main submodules inside [`epm-tracker-main/`](file:///c:/Users/xdrut/Downloads/epm-tracker-main/epm-tracker-main/):
- **`backend`**: NestJS 11 TypeScript API gateway with Prisma ORM and Socket.io WebSockets.
- **`web-dashboard`**: React 19 + Vite dashboard with Leaflet interactive map and CSV export engine.
- **`android-app`**: Kotlin + Jetpack Compose native app with Room DB offline caching and WorkManager batch sync.

For complete source code, installation steps, and detailed API documentation, please open [`epm-tracker-main/README.md`](file:///c:/Users/xdrut/Downloads/epm-tracker-main/epm-tracker-main/README.md).
