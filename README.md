# CalorieFlow AI

CalorieFlow AI is a calorie and nutrition tracker with a gym companion,
built as a mobile-first web app and PWA. Log meals in seconds by snapping a
photo, speaking, scanning a barcode, or searching, and let AI estimate the
nutrition. Tagline from the app itself: "Premium AI calorie tracker & gym
companion. Snap, speak, or scan to log meals in seconds."

## Features

- **AI food scan**: photograph a meal and get calorie and macro estimates
  (`analyzeFoodImage` server function, route `/scan`).
- **Voice logging**: speak a meal and have it parsed into food entries
  (`transcribeVoice`, route `/voice`). Premium feature.
- **Barcode scanning**: scan packaged foods, resolved through Open Food
  Facts with a server-side barcode cache (`lookupBarcode`, route `/barcode`).
- **Food diary**: daily diary with meals and food entries, meal templates,
  favorites, copy yesterday or a whole day, and a trash with restore
  (routes `/today`, `/diary`, `/add-food`).
- **AI coach**: chat with an AI nutrition coach (`chatWithCoach`, route
  `/coach`). Premium feature.
- **Workouts**: log workouts, use workout plans, and set workout reminders
  (route `/workout`).
- **Progress tracking**: weight logs, progress photos, streaks, and daily
  summaries (route `/progress`).
- **Health sync**: health connections and daily activity data (routes
  `/activity`, `/health`). Native Health Connect and HealthKit support is
  planned and tracked on the in-app Platform Readiness page (`/platform`).
- **Accounts and privacy**: Supabase Auth sign up and login, onboarding,
  privacy settings, full data export, clear AI history, and account
  deletion (routes `/login`, `/signup`, `/onboarding`, `/settings`).
- **Subscriptions**: free and premium tiers with feature gates (AI scan is
  limited to 3 per day on free; voice logging, AI coach, and progress
  photos are premium). Billing is wired for Stripe on web or RevenueCat on
  mobile; see `BACKEND_SETUP.md`.
- **Local-first and offline**: data persists in a local store first and
  mirrors to Supabase when signed in, so the app also works as an offline
  demo without an account.

## Tech stack

- React 19 and TypeScript
- TanStack Start, TanStack Router (file-based routing), TanStack Query
- Tailwind CSS 4 with shadcn/ui (Radix UI primitives)
- Supabase (Postgres, Auth, Storage) for the backend
- Lovable AI Gateway for the AI features (food image analysis, voice
  transcription, coach chat)
- Vite 8 and Nitro, deployed to Cloudflare Workers (`wrangler.jsonc`)
- React Hook Form and Zod for forms and validation

## Getting started

Prerequisites: Node.js and npm, plus a Supabase project for the backend.

```sh
git clone https://github.com/ramgubbala333-byte/calorieflow-ai-app.git
cd calorieflow-ai-app
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` using `.env.example` as the template. The main groups are:

- Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID`, plus server-side `SUPABASE_URL`,
  `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- AI Gateway: `LOVABLE_API_KEY` (required for the AI features).
- Optional: Stripe or RevenueCat keys for subscriptions, and Firebase or
  APNs keys for push notifications.

For full backend setup (SQL migrations in order, storage buckets, auth
providers, feature gates, and the security checklist), follow
[BACKEND_SETUP.md](BACKEND_SETUP.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (Cloudflare Workers target) |
| `npm run build:dev` | Build in development mode |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format the codebase with Prettier |

## Project structure

```text
src/
  routes/            File-based routes (today, diary, scan, voice, coach,
                     workout, progress, subscription, settings, and more)
  components/        App shell, navigation, meal cards, and ui/ (shadcn/ui)
  lib/
    ai.functions.ts      AI server functions (image scan, coach, voice)
    server.functions.ts  Backend server functions (meals, workouts,
                         barcode, subscriptions, privacy, streaks)
    store.ts             Local-first store with localStorage persistence
    sync.ts              Supabase sync bridge
    health.ts, streaks.ts, notifications.ts, mock-data.ts
  hooks/             Auth and subscription hooks
  integrations/
    supabase/        Supabase clients, auth helpers, generated types
    lovable/         Lovable auth integration
supabase/
  config.toml        Local Supabase configuration
  migrations/        SQL migrations for all backend tables
public/              PWA manifest, icons, offline fallback page
BACKEND_SETUP.md     Step-by-step backend setup guide
```

## License

MIT. See [LICENSE](LICENSE).
