# CalorieFlow AI — Backend Setup Guide

## Architecture Overview

```
Browser / PWA
    │
    ▼
TanStack Start (React 19 + SSR)          ← src/routes/
    │  server functions (createServerFn)  ← src/lib/server.functions.ts
    │  AI functions (vision/voice/coach)  ← src/lib/ai.functions.ts
    ▼
Cloudflare Workers (wrangler.jsonc)
    │
    ├── Supabase (PostgreSQL + Auth + RLS + Storage)
    ├── Lovable AI Gateway  → Google Gemini 2.5 Flash
    ├── Open Food Facts API (barcode lookup, no auth)
    └── Stripe / RevenueCat (subscriptions)
```

---

## 1. Supabase Project Setup

### 1a. Run migrations (in order)

Go to **Supabase Dashboard → SQL Editor** and run each file in order:

```
supabase/migrations/20260527212310_*.sql   ← core tables
supabase/migrations/20260527212330_*.sql   ← function revokes
supabase/migrations/20260527214410_*.sql   ← subscription security
supabase/migrations/20260528000000_backend_complete.sql  ← all new tables
```

Or via CLI:
```bash
supabase db push
```

### 1b. Create Storage buckets

In **Supabase Dashboard → Storage → New bucket**:

| Bucket name        | Public | Max file size | Allowed MIME types |
|--------------------|--------|---------------|--------------------|
| `progress-photos`  | No     | 10 MB         | `image/*`          |
| `food-scans`       | No     | 8 MB          | `image/*`          |

Then add Storage RLS policies for `progress-photos`:

```sql
-- In SQL Editor, Storage schema:

-- SELECT
CREATE POLICY "user reads own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- INSERT
CREATE POLICY "user inserts own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- DELETE
CREATE POLICY "user deletes own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

Repeat the same three policies for the `food-scans` bucket.

### 1c. Enable Auth providers

In **Supabase Dashboard → Authentication → Providers**:

- **Email** — enabled by default
- **Google** — enable, add your Google OAuth client ID/secret
  - Redirect URL: `https://xxxx.supabase.co/auth/v1/callback`
  - Add `https://app.calorieflow.ai` to the Google OAuth allowed origins
- **Apple** — enable with your Apple app credentials (for iOS builds)

### 1d. Copy environment variables

```
VITE_SUPABASE_URL          → Dashboard → Settings → API → URL
VITE_SUPABASE_PUBLISHABLE_KEY → anon key
SUPABASE_SERVICE_ROLE_KEY  → service_role key (KEEP SECRET)
```

---

## 2. Lovable AI Gateway (required for AI features)

The AI food scan, voice logging, and AI coach all route through the Lovable AI Gateway which proxies to Gemini 2.5 Flash.

1. Go to your **Lovable Project → Settings → AI Gateway**
2. Copy the `LOVABLE_API_KEY`
3. Add to `.env` (server-side only — never prefix with `VITE_`)

Features powered by this key:
- `analyzeFoodImage` — photo → food items + macros
- `transcribeVoice`  — voice transcript → food items + macros
- `chatWithCoach`    — AI coach context-aware responses

**Rate limiting:** The gateway has built-in rate limiting. The `checkSubscription` server function enforces:
- Free tier: 3 AI scans/day
- Premium: unlimited

---

## 3. Open Food Facts (barcode scanning)

No API key required. The `lookupBarcode` server function:
1. Checks `barcode_cache` table first (30-day cache)
2. Falls back to `world.openfoodfacts.org/api/v2/product/{barcode}`
3. Upserts result into cache for future lookups

No setup needed — works out of the box.

---

## 4. Subscriptions

### Option A: Stripe (recommended for web)

1. Create a Stripe account at stripe.com
2. Create two products:
   - **CalorieFlow Premium Monthly** → copy `price_...` ID
   - **CalorieFlow Premium Yearly** → copy `price_...` ID
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_MONTHLY=price_...
   STRIPE_PRICE_ID_YEARLY=price_...
   ```
4. Create a Cloudflare Worker route or TanStack server function to handle the Stripe webhook at `/api/stripe/webhook`
5. Webhook handler should upsert `subscriptions` table using `supabaseAdmin`

Example webhook handler snippet:
```typescript
// src/lib/stripe.webhook.ts
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function handleStripeWebhook(rawBody: string, signature: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata.userId;  // set this when creating checkout session
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      tier: sub.items.data[0].price.id === process.env.STRIPE_PRICE_ID_YEARLY ? "yearly" : "monthly",
      status: sub.status,
      provider: "stripe",
      provider_subscription_id: sub.id,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    }, { onConflict: "user_id" });
  }
}
```

### Option B: RevenueCat (for Expo/React Native)

1. Create a RevenueCat project at dashboard.revenuecat.com
2. Add iOS/Android apps, configure entitlements
3. Add `REVENUECAT_API_KEY` to `.env`
4. Use RevenueCat webhook to update `subscriptions` table same as above

---

## 5. Push Notifications (workout reminders)

### Web Push (PWA)

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Add to `.env`:
   ```
   FCM_SERVER_KEY=...
   VITE_FCM_VAPID_KEY=...  (public key, safe to expose)
   ```
3. Register service worker in the PWA to handle push events
4. Call `registerNotificationToken` server function with the subscription object

### Mobile (Expo)

Use `expo-notifications`:
```typescript
import * as Notifications from "expo-notifications";
const token = (await Notifications.getExpoPushTokenAsync()).data;
await registerNotificationToken({ token, platform: "ios" }); // or "android"
```

Reminders stored in the `reminders` table can be read by your notification cron job or Supabase Edge Function to dispatch at the right time.

---

## 6. New Server Functions Reference

All in `src/lib/server.functions.ts`. All require a valid Supabase JWT passed as `Authorization: Bearer <token>` (handled automatically by the frontend's `createServerFn` calls).

| Function                    | Method | Description |
|-----------------------------|--------|-------------|
| `copyYesterday`             | POST   | Clone yesterday's meals into today |
| `copyWholeDay`              | POST   | Copy meals from any date to another |
| `addWeightLog`              | POST   | Log manual weight entry |
| `uploadProgressPhoto`       | POST   | Upload body photo to Supabase Storage |
| `createWorkoutReminder`     | POST   | Create/update gym plan + reminder |
| `logWorkout`                | POST   | Log completed workout session |
| `lookupBarcode`             | POST   | Barcode → nutrition (cached) |
| `checkSubscription`         | POST   | Get tier, limits, isPremium |
| `exportUserData`            | POST   | Full GDPR data export as JSON |
| `deleteUserAccount`         | POST   | Permanent account + data deletion |
| `registerNotificationToken` | POST   | Save device push token |
| `updatePrivacySettings`     | POST   | Update privacy preferences |
| `clearAiHistory`            | POST   | Delete all AI chat history |
| `getStreaks`                 | POST   | Get current logging/workout streaks |

AI functions in `src/lib/ai.functions.ts`:

| Function            | Description |
|---------------------|-------------|
| `analyzeFoodImage`  | Photo → food items + confidence score |
| `transcribeVoice`   | Text transcript → food items |
| `chatWithCoach`     | Context-aware AI coach response |

---

## 7. New Database Tables

| Table                 | Purpose |
|-----------------------|---------|
| `weight_logs`         | Manual weight entries (distinct from health-app synced data) |
| `progress_photos`     | Body progress photo metadata (files in Storage) |
| `workout_plans`       | Recurring gym schedule |
| `reminders`           | Push notification schedules |
| `notification_tokens` | Device FCM/APNs tokens |
| `daily_summaries`     | Cached per-day macro totals |
| `streaks`             | Logging and workout streak counters |
| `ai_chat_history`     | AI coach conversation history |
| `privacy_settings`    | Per-user privacy preferences |
| `audit_logs`          | Immutable trail of exports/deletions |
| `barcode_cache`       | Shared barcode lookup cache |

Profile table also extended with: `gender`, `goal_weight`, `goal_type`, `timezone`, `week_start_day`.

---

## 8. Feature Gates (Free vs Premium)

Enforced in `checkSubscription` and should be checked in route components:

| Feature                  | Free | Premium |
|--------------------------|------|---------|
| Manual food logging      | ✅   | ✅      |
| Barcode scanning         | ✅   | ✅      |
| Basic diary              | ✅   | ✅      |
| Data export              | ✅   | ✅      |
| AI food scan             | 3/day | Unlimited |
| Voice logging            | ❌   | ✅      |
| AI coach                 | ❌   | ✅      |
| Progress photos          | ❌   | ✅      |
| Advanced insights        | ❌   | ✅      |
| Unlimited reminders      | ❌   | ✅      |

---

## 9. Security Checklist

- [x] RLS on every user table — users can only access own rows
- [x] `audit_logs` INSERT revoked from `authenticated` — only service_role writes
- [x] `subscriptions` UPDATE/DELETE revoked from `authenticated`
- [x] `supabaseAdmin` only used server-side (`client.server.ts`)
- [x] `SUPABASE_SERVICE_ROLE_KEY` never prefixed with `VITE_`
- [x] `LOVABLE_API_KEY` never prefixed with `VITE_`
- [x] All server functions validate input with Zod
- [x] `deleteUserAccount` requires email confirmation before deletion
- [x] Progress photos scoped to user folder in Storage (`{userId}/filename`)
- [ ] Add CORS headers to Cloudflare Workers config for your domain
- [ ] Set up Stripe webhook signature verification
- [ ] Configure Cloudflare rate limiting rules (free tier: 10k req/day)

---

## 10. Deployment

### Development
```bash
npm run dev        # Vite dev server on localhost:5173
```

### Production (Cloudflare Workers)
```bash
npm run build
wrangler deploy    # Deploys to workers.dev or your custom domain
```

Set secrets in Cloudflare (instead of `.env`):
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put LOVABLE_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```
