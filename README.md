# Fleet Console (Next.js 14 Demo)

Production-ready demo of a unified AMR control layer built with Next.js 14 App Router, TypeScript, Tailwind, shadcn-style UI components, and deployable on Vercel.

## What It Includes

- Mixed vendor fleet model (`locus`, `vendor_b`) with canonical normalization.
- Tick-on-request simulator (every API call can advance simulation when `>5s` since last tick).
- Role-gated command endpoints using `x-role` (`viewer`, `operator`, `admin`).
- Audit trail with success/fail result + reason payload.
- Dispatch workflows (assign, reroute, cancel).
- Public API routes under `app/api/*`.
- In-app API docs page at `/api-docs`.
- Persistence abstraction:
  - Uses Vercel KV / Upstash if env vars exist.
  - Falls back to in-memory storage automatically when KV is not configured.

## Tech Stack

- Next.js `14.2.x` (App Router)
- TypeScript
- Tailwind CSS
- shadcn-style UI components (cards, tables, tabs, badges, buttons, dropdowns, dialogs)
- lucide-react icons
- zod validation
- `@vercel/kv` for KV adapter

## Routes

- `/` Overview
- `/robots/[id]` Robot detail
- `/dispatch` Task dispatch
- `/audit` Audit log
- `/api-docs` API docs

## API Endpoints

- `GET /api/robots`
- `GET /api/robots/:id`
- `GET /api/tasks`
- `POST /api/tasks/assign`
- `POST /api/robots/:id/pause`
- `POST /api/robots/:id/resume`
- `POST /api/tasks/:id/reroute`
- `POST /api/tasks/:id/cancel`
- `GET /api/audit?robot_id=&action=&result=&limit=`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

4. Open:

- `http://localhost:3000`

## Environment Variables

Defined in `.env.example`:

- `NEXT_PUBLIC_APP_NAME` (optional UI title)
- `KV_REST_API_URL` (optional; enables KV persistence)
- `KV_REST_API_TOKEN` (optional; enables KV persistence)
- `KV_REST_API_READ_ONLY_TOKEN` (optional)

If KV vars are missing, app still runs using in-memory fallback.

## Vercel Deployment

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import project in Vercel.
3. Add env vars from `.env.example` in Vercel Project Settings:
   - Add KV vars if you want persistence across instances.
4. Deploy.

Build command and output are standard Next.js defaults:

- Build: `npm run build`
- Start: `npm run start`

## Notes

- No external auth is used; role is toggled client-side and sent as `x-role` header for mutation calls.
- Viewer role is read-only and receives `403` on mutating endpoints.
- Simulator runs safely without background workers by ticking during API requests.
