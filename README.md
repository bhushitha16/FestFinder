# FestFinder - College Fest Portal

FestFinder is a comprehensive college fest management portal that allows students to discover and register for events, and college admins to manage their fests. It features secure authentication, event management, and a dedicated super-admin dashboard.

## 🚀 Features

- **Multi-Role Authentication**: Student, College Admin, and Super Admin roles.
- **Passwordless Login**: Integrated with **phone.email** for secure OTP-based email verification.
- **Event Discovery**: Search and filter fests by category and college.
- **Management Dashboard**: Detailed analytics and registration management for admins.
- **Secure Backend**: Built with Express and Drizzle ORM, with PostgreSQL.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **pnpm** (v8.0.0 or higher) - Recommended over npm/yarn
- **PostgreSQL** (Local installation or cloud instance like Neon.tech)

---

## ⚙️ Environment Configuration

Create a `.env` file in the **root** of the project and provide the following variables:

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"

# API Server Port
PORT=5000

# Frontend API Base URL (Used by Vite)
VITE_API_BASE_URL="http://localhost:5000"

# (Optional) Super Admin Credentials
SUPER_ADMIN_EMAIL="superadmin@festportal.com"
SUPER_ADMIN_PASSWORD="superadmin123"
```

> [!NOTE]
> For development, you may also need a `.env` file in `artifacts/api-server/` with the same `DATABASE_URL` and `PORT`.

---

## 🏁 Getting Started (Linux & macOS)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Database Schema
Ensure your database is running and the `DATABASE_URL` is correct, then run:
```bash
# Push the Drizzle schema to your PostgreSQL database
export DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"') && pnpm --filter @workspace/db run push-force
```

### 3. Start Development Servers
Run both backend and frontend concurrently:
```bash
pnpm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🪟 Getting Started (Windows)

### 1. Install Dependencies
Open PowerShell or Command Prompt in the project root:
```powershell
pnpm install
```

### 2. Setup Database Schema
In PowerShell:
```powershell
# Set the environment variable and run the push command
$env:DATABASE_URL = (Select-String -Path .env -Pattern "^DATABASE_URL=(.*)").Matches.Groups[1].Value.Trim('"')
pnpm --filter @workspace/db run push-force
```
*If this fails, manually set your `DATABASE_URL` in the terminal before running the push-force command.*

### 3. Start Development Servers
```powershell
pnpm run dev
```

---

## 🔑 Default Credentials

### Super Admin
- **Email**: `superadmin@festportal.com`
- **Password**: `superadmin123`
- **Login URL**: `/superadmin/login`

### Student OTP Login
1. Navigate to `/student/login`.
2. Click the **"Verify Email"** button.
3. Complete the OTP verification via **phone.email**.

---

## 📂 Project Structure

- `artifacts/api-server`: Express backend API.
- `artifacts/fest-portal`: React + Vite frontend application.
- `lib/db`: Database schema definitions (Drizzle) and connection client.
- `lib/api-spec`: OpenAPI/Swagger documentation.

---

## 🛠️ Troubleshooting

- **500 Internal Server Error**: Check the backend terminal logs. Ensure `DATABASE_URL` is correct and accessible.
- **Connection Refused**: Ensure the backend (port 5000) is running before the frontend attempts to call it.
- **Drizzle Push Failure**: Verify your network connectivity to the PostgreSQL host.

---

## 📄 License
MIT License
