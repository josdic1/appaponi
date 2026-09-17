# Appoponi

Camp event operations and guest app for administrators, staff, and member households.

## Roles

- **Admin** — events, households, cabins, staff, scheduling, meal planning, services, notices.
- **Staff** — Today queue, assigned schedule, attendance, babysitting, food fulfillment, notices.
- **Member household** — Today, itinerary, stay/cabin, meals and services, directory, household attendance/lead, notices.

## Local development

Requirements: Node.js, npm, PostgreSQL.

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Copy `backend/.env.example` to `backend/.env` and set the database/JWT values.
3. If needed, copy `frontend/.env.example` to `frontend/.env` and change the API URL.
4. Apply migrations:

   ```bash
   npm --workspace @appoponi/backend run db:migrate
   ```

5. Start frontend + backend:

   ```bash
   npm run dev
   ```

Frontend defaults to `http://localhost:5173`; backend defaults to `http://localhost:3001`.

## Verification

```bash
npm run typecheck
npm --workspace @appoponi/backend run check:family-camp
git diff --check
```

The automated end-to-end verification is referred to as **the check**.

## Production builds

Build everything:

```bash
npm run build
```

Backend only:

```bash
npm run build:backend
npm start
```

Frontend only:

```bash
npm run build:frontend
```

Production backend environment requires `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`. Set `NODE_ENV=production`. The frontend build should set `VITE_API_URL` to the deployed backend origin.

The backend exposes `GET /api/health` for deployment health checks. Development login/demo endpoints reject requests when `NODE_ENV=production`.
