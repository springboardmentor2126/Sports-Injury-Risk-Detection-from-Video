# AI Sports Injury Risk Detection — Frontend

React + TypeScript + Vite + Tailwind CSS v4, per `docs/Tech_Stack.md`.

## What's wired up (Milestone 1)

- **Auth**: Login, Register, JWT stored client-side, auto-attached to every
  API call, auto-cleared on 401.
- **Routing**: `react-router-dom`, protected routes redirect to `/login`
  when logged out.
- **Athlete Profile**: full read/edit form for athletes; read-only roster
  table for coach/physio/sports_scientist/admin roles (matches backend RBAC).
- **Dashboard**: role-aware summary, risk gauge widget (shows "no data yet"
  honestly — the prediction engine isn't built until Milestone 3).
- **Layout**: sidebar nav per `docs/UI_Wireframes.md` Screen 3.

## Not wired up yet (later milestones)

- `/upload` and `/reports` are placeholder pages — real functionality
  depends on the Video Processing Engine, Pose Estimation Engine, and
  Injury Risk Prediction Engine (Milestone 2 & 3 backend work).

## Setup

```bash
npm install
cp .env.example .env   # adjust VITE_API_URL if your backend runs elsewhere
npm run dev
```

Runs on `http://localhost:5173`. Make sure the backend
(`uvicorn backend.app.main:app --reload`) is running on
`http://127.0.0.1:8000` first, or update `VITE_API_URL` in `.env`.

## Design tokens

Defined in `src/index.css` under `@theme`. Dark base
(`--color-track-slate`) with risk-level colors (`risk-low` /
`risk-moderate` / `risk-high` / `risk-critical`) mapped directly to the
project's own Risk Categories, so color always carries meaning rather
than decoration. Signature element is `RiskGauge` — a ring dial styled
after a biometric monitor, reused anywhere a risk score is shown.

## Scripts

- `npm run dev` — dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build locally
