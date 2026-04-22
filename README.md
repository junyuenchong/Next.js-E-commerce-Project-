# E‑commerce demo (Next.js + Postgres)

A full‑stack shop with a **customer storefront** and an **admin dashboard**. The frontend uses Next.js; products, orders, and users are stored in a **PostgreSQL** database (this repo is set up for **Neon**).

---

## Try the live site

| Area  | Link                                                                             |
| ----- | -------------------------------------------------------------------------------- |
| Store | [Open storefront](https://next-js-e-commerce-project.onrender.com/features/user) |
| Admin | [Open admin](https://next-js-e-commerce-project.onrender.com/features/admin)     |

_(Replace with your own domain when you deploy.)_

---

## Tech stack

- Next.js 15 + React + TypeScript
- PostgreSQL (Neon-ready) + Prisma
- NextAuth (`next-auth`)
- TanStack Query + Redux
- PayPal checkout
- Optional: Redis, RabbitMQ, Cloudinary

---

## How the folders are laid out

- `src/app/features/user`: storefront pages, hooks, components, api routes
- `src/app/features/admin`: admin pages, shared logic, api routes
- `src/backend/modules`: backend business logic and data access
- `src/shared`: shared types and schemas
- `src/middleware.ts`: request checks and session refresh

### Import conventions

- Prefer **`@/app/utils/*`** and **`@/app/providers/*`** for app-layer helpers (HTTP, auth helpers, realtime query helpers).
- Prefer **`@/backend/features/<module>`** entrypoints for backend features (do not deep-import `.service/.repo` from API routes).
- Shared contracts (types + schemas) live in **`src/shared/`** and should be imported via `@/shared/...`.

Examples:

```ts
import http from "@/app/utils/http";
import { authOptions } from "@/app/utils/auth";
import { resolveUserId } from "@/backend/core/session";
import { moneyToNumber } from "@/backend/core/money";
import { updateOrderShipmentSchema } from "@/shared/schema/order";
```

Quick rule:

- In `src/app/**/api/**`, import backend from `@/backend/modules/<module>` entry files.
- Avoid deep imports like `.../<module>.service` or `.../<module>.repo` in route handlers.

---

## Before you start

- **Node.js 20+**
- **npm** (or pnpm / yarn)
- A **PostgreSQL** URL (Neon works well)

---

## Environment variables

Create **`.env`** or **`.env.local`** in the project root.

```bash
# Database (Neon: use SSL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Auth — must match the site URL people use in the browser
# Local example: http://localhost:3000  (use your real port)
# Production: your real HTTPS URL
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="long-random-string"

# Google / Facebook login (optional for local dev)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Optional
PAYPAL_CLIENT_ID=""
PAYPAL_CLIENT_SECRET=""
PAYPAL_WEBHOOK_ID=""
# Defaults to MYR
PAYPAL_CURRENCY="MYR"
NEXT_PUBLIC_PAYPAL_CURRENCY="MYR"
# 1 = strict webhook-truth mode (capture returns processing; webhook finalizes payment/order)
PAYMENT_WEBHOOK_TRUTH="0"
# Auto-cancel stale PENDING/PROCESSING payments after N minutes.
PAYMENT_EXPIRE_MINUTES="5"
# Retry up to N unhandled PayPal webhook inbox events per cron run.
PAYMENT_WEBHOOK_RETRY_LIMIT="50"
# Inventory deduction mode:
# - FULFILLED: deduct stock when order enters fulfilled
# - PAID: Shopee-like, deduct stock when paid order is persisted
STOCK_DEDUCT_MODE="FULFILLED"

# Email (order receipts, password reset)
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM=""
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="1"

REDIS_URL="redis://..."
# RabbitMQ (optional): PayPal capture publishes durable jobs for payment/email/analytics workers.
# If unset, payment-side effects run inline in the API route.
RABBITMQ_URL="amqp://..."
RABBITMQ_QUEUE_ORDER_EMAIL="order.email"
RABBITMQ_QUEUE_ORDER_PAYMENT="order.payment"
RABBITMQ_QUEUE_ORDER_ANALYTICS="order.analytics"
# Backward-compat alias (optional): if payment queue var above is not set.
RABBITMQ_QUEUE_ORDER_INVENTORY="order.inventory"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CRON_SECRET=""
```

### Recommended env presets

**Side project (simple + fast iteration):**

```bash
PAYMENT_WEBHOOK_TRUTH="0"
STOCK_DEDUCT_MODE="PAID"
CRON_SECRET="dev"
```

**Production (safer + auditable):**

```bash
PAYMENT_WEBHOOK_TRUTH="1"
STOCK_DEDUCT_MODE="FULFILLED"
CRON_SECRET="<long-random-secret>"
```

Notes:

- Side project preset reduces operational complexity and feels closer to Shopee checkout behavior.
- Production preset keeps webhook as source of truth and postpones stock deduction to fulfillment to reduce operational disputes.

**On Render:** copy the same keys into the dashboard. Set **`NEXTAUTH_URL`** to your production URL. Add OAuth redirect URLs in Google/Facebook (see below).

### RabbitMQ (optional)

- If `RABBITMQ_URL` is set, payment side effects run in workers.
- Required workers: `worker:payment`, `worker:email`, `worker:analytics`.
- Queue names: `order.payment`, `order.email`, `order.analytics`.
- If queue publish fails, API falls back to sync handling.

Local async worker startup example:

```bash
# terminal 1
npm run dev

# terminal 2
npm run worker:payment

# terminal 3
npm run worker:email

# terminal 4
npm run worker:analytics
```

Production checklist (short):

- Keep all workers running: `worker:payment`, `worker:email`, `worker:analytics`.
- Monitor queue depth for `order.payment`, `order.email`, `order.analytics`.
- If queue grows, first check worker health and RabbitMQ connection.
- If needed, restart workers and scale replicas.

---

## Install and run

```bash
npm install
npx prisma generate
```

### Windows note (Prisma EPERM)

If `prisma generate` fails with `EPERM rename query_engine-windows.dll.node`, stop the running Next dev server / any `node` process using Prisma, then rerun:

```bash
npx prisma generate
```

Optional sample data:

```bash
tsx scripts/seed.ts
```

**Development:**

```bash
npm run dev
```

Then open the URL Next.js prints (usually `http://localhost:3000`).

**Production build:**

```bash
npm run build
npm start
```

**Common scripts:**

| Command                    | Meaning                |
| -------------------------- | ---------------------- |
| `npm run lint`             | Check code style       |
| `npm run lint:fix`         | Fix style in `src/`    |
| `npm run worker:payment`   | Start payment worker   |
| `npm run worker:email`     | Start email worker     |
| `npm run worker:analytics` | Start analytics worker |

**Helpers:**

- `tsx scripts/seed.ts` — seed data
- `tsx scripts/check.ts` — inspect DB

---

## Orders

- User order list: `/features/user/orders`
- User order detail: `/features/user/orders/[id]` (items + images, shipping snapshot, PayPal ids, receipt email snapshot)

### Payment flow (security + stability)

1. **Create intent (server-owned)**  
   Backend creates/reuses one `Payment` row with `PENDING` status and stores pricing snapshot.
2. **Create gateway order (idempotent)**  
   Backend sends `PayPal-Request-Id` with the same idempotency key to avoid duplicate gateway orders.
3. **Capture with concurrency guard**  
   Capture path uses optimistic lock (`version`) so only one request can capture the same payment.
4. **Pending until webhook confirmation**  
   In webhook-truth mode, capture response returns `pending: true`; webhook is the final authority.
5. **Webhook inbox + dedupe + replay**  
   Webhook events are signature-verified, deduplicated by `(provider, eventId)`, and replayed by cron when unhandled.
6. **State-machine transition control**  
   Payment status only changes through allowed transitions (prevents invalid status jumps).
7. **Client status polling with idempotency check**  
   Status endpoint supports `x-idempotency-key` validation to ensure caller checks the correct transaction.

Main safety rules:

- Webhook events are signature-verified and deduplicated by `(provider, eventId)`.
- Create/capture calls use idempotency keys (`PayPal-Request-Id`).
- Capture uses optimistic concurrency (`version`) to block double capture.
- Payment status follows an allowed transition map.
- Stock behavior is controlled by `STOCK_DEDUCT_MODE`.
- Cron endpoints are protected by `CRON_SECRET`.

Webhook retry job notes:

- It scans inbox rows with `handledAt = null`.
- It retries processing for crash-recovery and consistency.
- Recommended schedule: every 1 minute.

Cron example:

```bash
curl -X POST \
  "https://<your-domain>/features/admin/api/payments/webhook-retry" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Stock summary:

- `FULFILLED`: deduct stock when order reaches `fulfilled`.
- `PAID`: deduct stock after payment persistence, and restock on valid cancel/refund transitions.

---

## Deploy (example: Render)

1. Connect the GitHub repo to Render.
2. Add all environment variables.
3. Set OAuth redirect URLs in Google and Facebook (next section).
4. Push to deploy.

### Render Cron Job setup (recommended)

Create two cron jobs in Render so payment records stay consistent:

1. Open your Render service, then go to **Cron Jobs**, then click **New Cron Job**.
2. Fill fields like below:
   - **Name**: `payments-expire`
   - **Schedule**: `*/1 * * * *` (every 1 minute)
   - **Method**: `POST`
   - **URL**: `https://<your-domain>/features/admin/api/payments/expire`
   - **Header**: `x-cron-secret: <CRON_SECRET>`
3. Create second cron job:
   - **Name**: `payments-webhook-retry`
   - **Schedule**: `*/1 * * * *` (every 1 minute)
   - **Method**: `POST`
   - **URL**: `https://<your-domain>/features/admin/api/payments/webhook-retry`
   - **Header**: `x-cron-secret: <CRON_SECRET>`

Quick verify:

- Call both cron endpoints manually once after deploy.
- If you get `403`, check `CRON_SECRET` and header name.

**Suggested Render commands:**

- Build: `npm install && npx prisma generate && npm run build`
- Start: `npm start`

---

## OAuth (Google and Facebook)

Use these **redirect URLs** in the provider consoles (adjust the domain if you self‑host):

**Google**

1. Open [Google Cloud Console](https://console.cloud.google.com/), then go to `APIs & Services`, then `Credentials`.
2. Add authorized redirect URI:  
   `https://next-js-e-commerce-project.onrender.com/features/user/api/auth/callback/google`

**Facebook**

1. Open [Facebook Developers](https://developers.facebook.com/), then open your app, then open `Facebook Login`.
2. Add redirect URI:  
   `https://next-js-e-commerce-project.onrender.com/features/user/api/auth/callback/facebook`
