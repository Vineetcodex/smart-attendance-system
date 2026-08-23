# 🏢 DRP Technology — QR & Multi-Pose Biometric Facial Attendance System

An enterprise-grade, triple-factor automated attendance verification system featuring encrypted office Master QR code scanning, 3D multi-pose facial biometric recognition (Straight, Left, Right), anti-spoofing liveness detection, and GPS geofence validation.

---

## 🌟 Key Features

### 1. 🛡️ Triple-Factor Biometric Verification
- **Encrypted Office Master QR**: Salted AES-encrypted wall poster QR payload unique to the organization.
- **Multi-Pose Face ID**: 3-stage enrollment (Straight, Left 30°, Right 30°) using deep neural facial embeddings.
- **Anti-Spoofing & Liveness**: Real-time eye-blink tracking, micro-motion jitter analysis, and Laplacian texture gradient detection to prevent 2D photo/screen replay attacks.
- **Anti-Malpractice Duplicate Blocker**: Strict 1:N vector cross-matching preventing the same person from registering under multiple IDs or emails.
- **GPS Geofence Validation**: Verifies device coordinates against authorized office perimeter radius.

### 2. 🖥️ Web Admin Management Portal (React + Vite + TailwindCSS)
- **Live Attendance Dashboard**: Real-time Server-Sent Events (SSE) stream of employee check-ins with photo snapshots, similarity scores, and distance metrics.
- **Master QR Poster Generator**: High-resolution printable SVG and PNG office posters.
- **Employee Directory**: Full CRUD management, shift configuration, and biometric vector inspector.
- **Attendance Reporting & CSV Export**: Advanced filtering by date range, department, and status (Present, Late, Rejected).
- **Security & Geofence Settings**: Configurable office GPS coordinates, geofence radius, and similarity thresholds.

### 3. 📱 Employee Self-Service Mobile Portal
- **Dual-Step Check-in Flow**: Scan wall poster QR ➔ Seamless front-camera biometric facial scan.
- **Interactive Audio Feedback**: Real-time sound effects for step progression, shutter captures, and security alerts.
- **Personal Punch History**: View recent attendance records, punctuality status, and check-in times.

---

## 🏗️ System Architecture

```
attendance-system/
├── backend/                  # Node.js + Express + TypeScript Backend API
│   ├── src/
│   │   ├── config/           # Environment & security config
│   │   ├── controllers/      # Auth, Employee, Org, and Attendance controllers
│   │   ├── db/               # JSON file database manager & seed script
│   │   ├── middleware/       # JWT & Role authorization
│   │   ├── routes/           # API v1 REST endpoints
│   │   ├── services/         # FaceService, QrService, GeoService, ExportService
│   │   └── server.ts         # Express server entry point
│   └── data/                 # Local database storage
│
├── web_admin/                # React 18 + TypeScript + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/       # UI Components (Sidebar, Navbar, Poster, Badges)
│   │   ├── pages/            # Dashboard, Employees, Reports, Simulator, MobileApp
│   │   └── services/         # faceDetectionService, qrScannerService, api
│   └── public/               # Face detection neural models
│
└── mobile_app/               # Flutter Cross-Platform Mobile Client
    └── lib/
        ├── core/             # Network, config, theme, storage
        └── features/         # Auth, Camera scanner, Attendance history
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```
*API runs on `http://localhost:5000` (API base: `http://localhost:5000/api/v1`)*

### 2. Start the Web Admin Portal
```bash
cd web_admin
npm install
npm run dev
```
*Portal runs on `http://localhost:5173/`*

---

## 🔑 Default Credentials

### Admin Portal
- **URL**: `http://localhost:5173/admin`
- **Email**: `admin@drptech.com`
- **Password**: `admin123`
- **Role**: `SUPER_ADMIN`

### Employee Portal (Web / Mobile)
- **URL**: `http://localhost:5173/mobile`
- **Default Employee Code**: `EMP-1001` (or self-signup with live Face ID)
- **Password**: `password123`

---

## 📜 License
MIT License. Built with precision for modern workplaces.
