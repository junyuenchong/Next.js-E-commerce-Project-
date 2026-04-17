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

| Piece                            | What it does here                                    |
| -------------------------------- | ---------------------------------------------------- |
| **Next.js 15 (App Router)**      | Frontend + server routes under `src/app/`            |
| **React + TypeScript**           | UI and typed codebase                                |
| **PostgreSQL (Neon-ready)**      | Primary database                                     |
| **Prisma**                       | ORM / database queries                               |
| **NextAuth.js (`next-auth`)**    | Authentication (email + OAuth like Google/Facebook)  |
| **TanStack Query (React Query)** | Client-side fetching, caching, and refetching        |
| **Redux (cart store)**           | Global cart state (`src/app/redux/`)                 |
| **Tailwind CSS**                 | Styling                                              |
| **Zod**                          | Request/body validation (e.g. cart mutations)        |
| **PayPal**                       | Checkout / order payment integration                 |
| **SSE (Server-Sent Events)**     | “Realtime” updates for some lists (events endpoints) |
| **Redis (optional)**             | Caching / speed-ups when configured                  |
| **RabbitMQ (optional)**          | Background jobs (payment, email, analytics workers)  |
| **Cloudinary (optional)**        | Image hosting for uploads                            |
| **Node.js 20+**                  | Runtime (local + deployment)                         |

---

## How the folders are laid out

**Frontend** lives under `src/app/`.

- **`features/user/`** — Storefront: pages, UI, hooks, and APIs under `/features/user/...`.
- **`features/admin/`** — Admin dashboard: pages, UI, shared client logic, and APIs under `/features/admin/...`.

Inside each feature, roughly:

| Folder        | Purpose                                                           |
| ------------- | ----------------------------------------------------------------- |
| `(routes)/`   | Page components                                                   |
| `api/`        | Server routes (REST handlers)                                     |
| `components/` | React UI (split into `components/client` and `components/server`) |
| `hooks/`      | Feature hooks (business logic, data fetching, side effects)       |
| `shared/`     | Feature-shared client helpers (admin uses this heavily)           |
| `nav/`        | Navigation model + filter rules (no React components)             |

Frontend layering rule:

- **Components are UI-only** (rendering + props).
- **Hooks/shared own the logic** (queries, mutations, state, effects).

Shared code used by both modules is in **`src/app/utils/`** and **`src/app/providers/`**. Cart state is in **`src/app/redux/`**.

**Backend** logic (database access + business rules) is in **`src/backend/features/`** — separate from the React tree.

**`src/middleware.ts`** — Runs on requests first (session cookie refresh and security checks).

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

### Frontend → Backend Workflow (Basic Flow)

```
Browser UI
  ↓
App Utils HTTP Layer
  ↓
Next.js Route Handlers
  ↓
Backend Module Actions/Services
  ↓
Prisma
  ↓
PostgreSQL (Neon)
  ↓
JSON Response → React Query/Redux → UI re-render
```

Notes:

- Backend runtime is **Node.js via Next.js route handlers** (not Express).
- Server Actions exist in some modules, but the primary data flow is API route based.
- Auth/session checks are enforced at route/middleware/backend guard level before service calls.

<details>
<summary>Folder tree (compact)</summary>

```txt
src/app/
├─ providers/     # QueryProvider + ReduxProvider
├─ utils/         # app-layer helpers (http, auth, realtime query, etc.)
├─ features/
│  ├─ user/       # storefront: (routes)/, api/, components/, hooks/, …
│  └─ admin/      # dashboard: (main)/, api/, components/, shared/, nav/, …
├─ redux/         # cart store
└─ layout.tsx     # root layout

src/backend/
└─ modules/       # features: services, repos, actions

src/shared/
├─ schema/         # zod validation contracts
└─ types/          # TypeScript contracts
```

</details>

---

## Backend module template (strict)

Business modules under `src/backend/features/<module>/` follow a consistent layout:

```txt
<module>/
├─ <module>.action.ts   # use-cases / entrypoints for routes
├─ <module>.service.ts  # orchestration / business logic
├─ <module>.repo.ts     # data access (Prisma)
├─ dto/                 # request/response DTOs
└─ index.ts             # public module entrypoint (preferred imports)
```

Rule of thumb:

- `src/app/**/api/**` should import backend logic from **`@/backend/features/<module>`**, not deep paths like `.../<module>.service` or `.../<module>.repo`.

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

### RabbitMQ (optional) — paid orders workflow

When **`RABBITMQ_URL`** is set, payment follows this pipeline:

```txt
[API]
  ↓
[Order Service]
  ↓ (publish event)
[RabbitMQ]
  ↓↓↓
[Payment Worker]
[Email Worker]
[Analytics Worker]
```

- API route validates/captures payment and persists order through Order Service.
- API publishes queue events (does not run all side effects inline).
- Workers consume jobs independently.

Default queues and responsibilities:

| Queue (default name) | Worker           | Purpose                                                   |
| -------------------- | ---------------- | --------------------------------------------------------- |
| `order.payment`      | Payment Worker   | Decrement `Product.stock` per order lines                 |
| `order.email`        | Email Worker     | Send receipt email                                        |
| `order.analytics`    | Analytics Worker | Bust analytics cache + publish admin order realtime event |

Message body is JSON with `v: 1`:

- **Payment:** `{ v, orderId, lines: [{ productId, quantity }] }`
- **Email:** `{ v, orderId, to, subject, text }`
- **Analytics:** `{ v, orderId, status? }`

Fallback behavior:

- If enqueue fails, API falls back to synchronous handling for correctness (stock/email/analytics updates).
- Without **`RABBITMQ_URL`**, the flow remains synchronous in request lifecycle.

> **Important (async required):**
> If `RABBITMQ_URL` is configured, you **must run async workers** (`payment`, `email`, `analytics`).
> Otherwise jobs will stay in queues and side effects (stock update, receipt email, analytics refresh) will not be applied until workers are started.

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

Production minimum checklist (async workers):

- Ensure all three workers are running continuously:
  - `worker:payment`
  - `worker:email`
  - `worker:analytics`
- Ensure queue depth is monitored (`order.payment`, `order.email`, `order.analytics`).
- Alert when queue backlog grows continuously (workers down/slow).
- Alert when worker process exits unexpectedly (restart policy required).
- Keep API fallback path enabled to avoid data inconsistency during broker incidents.
- Keep SMTP and Redis credentials valid, otherwise email/analytics workers will retry/fail jobs.

Suggested alert thresholds:

- Queue depth warning: `> 100` messages for 5 minutes.
- Queue depth critical: `> 1000` messages for 5 minutes.
- Oldest message age warning: `> 120s`.
- Oldest message age critical: `> 600s`.
- Worker restart alert: more than 3 restarts in 10 minutes.

Incident runbook (queue backlog / worker down):

1. Check worker process status (`payment`, `email`, `analytics`).
2. Check RabbitMQ connectivity from worker runtime.
3. Check dependency health:
   - Payment worker -> database reachable
   - Email worker -> SMTP reachable
   - Analytics worker -> Redis reachable
4. Restart failed worker(s) and confirm queue depth starts decreasing.
5. If backlog keeps growing, scale worker replicas horizontally.
6. Verify business effects after recovery:
   - stock decreased for new paid orders
   - receipt emails sent
   - admin analytics/orders views refreshed

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

**Other scripts:**

| Command                    | Meaning                          |
| -------------------------- | -------------------------------- |
| `npm run lint`             | Check code style                 |
| `npm run lint:fix`         | Fix style in `src/`              |
| `npm run format`           | Format with Prettier             |
| `npm run clean`            | Delete `.next` (safe on Windows) |
| `npm run dev:clean`        | Clean then start dev             |
| `npm run worker:payment`   | Start payment worker             |
| `npm run worker:email`     | Start email worker               |
| `npm run worker:analytics` | Start analytics worker           |

**Helpers:**

- `tsx scripts/seed.ts` — seed data
- `tsx scripts/check.ts` — inspect DB

---

## Product lists (pagination)

Lists use **cursor pagination** (by product id) so “Load more” stays fast and stable.

Example endpoints:

- Store: `GET /features/user/api/products?limit=10&cursor=<lastId>`
- Admin: `GET /features/admin/api/products?limit=20&cursor=<lastId>`

Response shape includes items and a `nextCursor` when more pages exist.

---

## Live updates (SSE)

The admin area can open **SSE** streams under `/features/admin/api/events/...` so lists refresh when data changes elsewhere. If SSE fails, the UI falls back to polling. The storefront uses a similar pattern where needed.

Currently supported admin streams:

- Products: `/features/admin/api/events/products`
- Categories: `/features/admin/api/events/categories`
- Orders: `/features/admin/api/events/orders`

---

## Support chat (Amazon-style, no websocket)

- **User page**: `GET /features/user/support/chat` (polling)
- **Admin page**: `GET /features/admin/support/chats` (polling)

APIs:

- User: `GET/POST /features/user/api/support/conversations`
- User: `GET/POST /features/user/api/support/conversations/[id]/messages`
- Admin: `GET /features/admin/api/support/conversations`
- Admin: `GET/POST /features/admin/api/support/conversations/[id]/messages`

---

## Coupons & vouchers

Supports Amazon-style vouchers:

- **Public vouchers**: can be shown on storefront and used by anyone.
- **Targeted vouchers**: require sign-in and must be assigned to selected users (bulk assign from admin users page).

Storefront vouchers API: `GET /features/user/api/coupons/vouchers`

---

## Orders

- User order list: `/features/user/orders`
- User order detail: `/features/user/orders/[id]` (items + images, shipping snapshot, PayPal ids, receipt email snapshot)

### Payment safety model

Simple flow:

1. Create payment intent in the database first. Initial status starts at `PENDING`, then moves to `PROCESSING` after gateway order creation.
2. Recalculate subtotal, discount, and total on the backend from cart and coupon snapshot. Frontend amount is never trusted.
3. Capture payment and wait for webhook confirmation when strict mode is enabled.
4. Update payment and order status using webhook as the final authority when `PAYMENT_WEBHOOK_TRUTH=1`.
5. Apply stock mutation based on the configured policy and actual status transition.

Core safety rules:

- Webhook events are deduplicated by `(provider, eventId)` and signature-verified.
- Stock deduction policy uses `STOCK_DEDUCT_MODE`.
- `FULFILLED` mode reduces stock only when order reaches `fulfilled`.
- `PAID` mode reduces stock immediately after payment and order persistence.
- Stock mutation is computed from status transition (`from` and `to`) consistently across admin updates, webhook updates, and expiry jobs.
- In `PAID` mode, cancellation-like transitions (`CANCELLED` and `REFUNDED`) restore stock only when the transition leaves a stock-deducted state.
- Expiry job endpoint is `POST /features/admin/api/payments/expire` and is protected by `CRON_SECRET`.

Production status and stock behavior:

| Scenario                                     | `STOCK_DEDUCT_MODE=FULFILLED`                                      | `STOCK_DEDUCT_MODE=PAID`                     |
| -------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| Payment captured and order persisted         | No stock change yet                                                | Deduct stock                                 |
| Order updated to `fulfilled`                 | Deduct stock                                                       | No extra stock change                        |
| Order updated to `cancelled` before shipment | No stock change (if not deducted yet)                              | Restock                                      |
| Webhook `PAYMENT.CAPTURE.REFUNDED`           | No stock change (unless previous transition deducted in this mode) | Restock when transition exits deducted state |
| Expiry job cancels stale payment/order       | No stock change (if stock not deducted yet)                        | Restock when transition exits deducted state |

This table describes business behavior. Real stock mutation is always computed by status transition logic in backend code.

### Admin analytics note

Admin dashboard analytics for revenue, order count, and units sold exclude `pending` and `cancelled` orders.

---

## Deploy (example: Render)

1. Connect the GitHub repo to Render.
2. Add all environment variables.
3. Set OAuth redirect URLs in Google and Facebook (next section).
4. Push to deploy.

**Suggested Render commands:**

- Build: `npm install && npx prisma generate && npm run build`
- Start: `npm start`

---

## Database tips

- After you change `schema.prisma`, apply schema updates using your team’s usual database workflow.
- Neon needs **SSL** (`sslmode=require` in the URL).
- For Neon’s pooler, use the **`-pooler`** host and `pgbouncer=true` if Neon’s docs say so.

---

## OAuth (Google and Facebook)

Use these **redirect URLs** in the provider consoles (adjust the domain if you self‑host):

**Google**

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Add authorized redirect URI:  
   `https://next-js-e-commerce-project.onrender.com/features/user/api/auth/callback/google`

**Facebook**

1. [Facebook Developers](https://developers.facebook.com/) → your app → Facebook Login.
2. Add redirect URI:  
   `https://next-js-e-commerce-project.onrender.com/features/user/api/auth/callback/facebook`
