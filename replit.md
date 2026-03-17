# Workspace

## Overview

College Fest Portal — A centralized platform for posting, viewing, and registering for college fests and events. Black and gold themed, premium design.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, shadcn/ui, Tailwind CSS, Framer Motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── fest-portal/        # React + Vite frontend (College Fest Portal)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## User Roles

1. **Student** — Signs up with college email, browses/registers for events, tracks registration status
2. **College Admin** — Creates/manages events, approves/rejects student registrations, requires Super Admin approval
3. **Super Admin** — Approves college admins, manages platform, views stats

## Auth

- Cookie-based sessions (httpOnly)
- Students: email verification required (token printed to console in dev)
- Admins: Super Admin approval required before login
- Super Admin credentials: `superadmin@festportal.com` / `superadmin123` (set via `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars)

## Database Schema

- `users` — all users (students, admins, super admin)
- `student_profiles` — college ID, college ID number
- `admin_profiles` — college name, designation
- `colleges` — approved colleges
- `events` — fest events with date, venue, category
- `registrations` — student event registrations with status
- `sessions` — session tokens

## API Routes

All routes prefixed with `/api`:
- Auth: `/auth/student/signup|login`, `/auth/admin/signup|login`, `/auth/superadmin/login`, `/auth/verify-email`, `/auth/me`, `/auth/logout`
- Public: `GET /colleges`, `GET /events`, `GET /events/:id`
- Student: `POST /events/:id/register`, `GET /student/registrations`
- Admin: `GET|POST /events`, `PUT|DELETE /events/:id`, `GET /admin/events`, `GET /admin/events/:id/registrations`, `PUT /admin/registrations/:id/status`
- Super Admin: `GET /superadmin/admins/pending`, `PUT /superadmin/admins/:id/approve|reject|suspend`, `GET /superadmin/stats|colleges|events`

## Frontend Pages

- `/` — Landing page with role selection cards
- `/student/login`, `/student/signup`, `/student/dashboard`
- `/admin/login`, `/admin/signup`, `/admin/pending`, `/admin/dashboard`
- `/superadmin/login`, `/superadmin/dashboard`
- `/verify-email` — Email verification page

## Seeded Data

8 colleges pre-seeded for development (IIT Delhi, IIT Bombay, Delhi University, etc.)
