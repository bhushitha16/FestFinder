# College Fest Portal — Lumina Fests

A centralized college fest platform with a black and gold luxury theme. Students can discover and register for events, college admins manage their institution's events, and a super admin oversees the entire platform.

## Architecture

**Monorepo (pnpm workspaces):**
- `artifacts/fest-portal` — React + Vite frontend (port `$PORT`, preview at `/`)
- `artifacts/api-server` — Express.js REST API (port 8080, proxied at `/api`)
- `lib/db` — Drizzle ORM schema + database client
- `lib/api-spec` — OpenAPI spec + orval codegen → React Query hooks
- `lib/api-client-react` — Auto-generated TypeScript API client

## Database

PostgreSQL via `DATABASE_URL`. Drizzle ORM manages schema.

**Tables:** `users`, `student_profiles`, `admin_profiles`, `colleges`, `events`, `registrations`, `event_photos`, `bookmarks`, `reviews`

**Push schema changes:** `pnpm --filter @workspace/db run push-force`

**Regenerate API client:** `pnpm --filter @workspace/api-spec run codegen`

## Auth

- Cookie-based sessions (httpOnly, `connect.sid`)
- Students: auto-verified on signup
- College Admins: require Super Admin approval before accessing dashboard
- Super Admin: `superadmin@festportal.com` / `superadmin123` (set via `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` env vars)

## User Roles

| Role | Sign-up path | Login path | Dashboard |
|------|-------------|-----------|-----------|
| Student | `/student/signup` | `/student/login` | `/student/dashboard` |
| College Admin | `/admin/signup` | `/admin/login` | `/admin/dashboard` |
| Super Admin | — | `/superadmin/login` | `/superadmin/dashboard` |

## Key Features

- **Students:** Browse events with category/status filters, register for events, bookmark events, post reviews on completed events, view registrations
- **College Admins:** Create/edit/delete events (with thumbnail URLs), manage student registrations (approve/reject), upload post-event photo galleries
- **Super Admin:** Approve/reject/suspend college admins, view platform stats, browse all colleges and events

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | List events (with filters: category, status, search, college_id) |
| GET | `/api/events/:id` | Event detail (includes photos + reviews) |
| POST | `/api/events` | Create event (admin only) |
| PUT | `/api/events/:id` | Update event (admin only) |
| DELETE | `/api/events/:id` | Delete event (admin only) |
| GET | `/api/events/:id/photos` | List event photos |
| POST | `/api/events/:id/photos` | Upload event photo (admin only) |
| GET | `/api/events/:id/reviews` | List reviews |
| POST | `/api/events/:id/reviews` | Submit review (registered student, completed event only) |
| GET | `/api/colleges` | List active colleges |
| GET | `/api/colleges/:id` | College detail with upcoming/past events |
| GET | `/api/categories` | List event categories |
| GET | `/api/bookmarks` | Student's bookmarked events |
| POST | `/api/bookmarks/:eventId` | Add bookmark |
| DELETE | `/api/bookmarks/:eventId` | Remove bookmark |
| POST | `/api/events/:id/register` | Register for event (student) |
| GET | `/api/student/registrations` | Student's registrations |
| GET | `/api/admin/events` | Admin's events |
| GET | `/api/admin/events/:id/registrations` | Event registrations (admin) |
| PUT | `/api/admin/registrations/:id/status` | Approve/reject registration |
| GET | `/api/superadmin/admins/pending` | Pending admin requests |
| POST | `/api/superadmin/admins/:id/approve` | Approve admin |
| POST | `/api/superadmin/admins/:id/reject` | Reject admin |
| POST | `/api/superadmin/admins/:id/suspend` | Suspend admin |
| GET | `/api/superadmin/stats` | Platform statistics |

## Design System

- **Theme:** Black background (`#0A0A0A`), gold primary (`hsl(43 74% 53%)`), dark card surfaces
- **Font:** Display = Playfair Display (serif), Body = Inter (sans)
- **CSS classes:** `gold-gradient-text`, `glass-panel` available globally
- **Components:** Custom `ui-components.tsx` (Button, Card, Badge, Input, Select, Dialog, StarRating)

## Error Handling

API returns `{ error: "..." }` for errors. Frontend reads `error?.response?.data?.error`. The `getErrorMessage()` utility in `lib/utils.ts` handles this.

## Seeded Data

- 8 colleges (IIT Delhi, Bombay, Madras, Kharagpur, Kanpur, Roorkee, Guwahati, Hyderabad)
- 8 upcoming events across all colleges
- 1 Super Admin account
