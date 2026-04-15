# E‑commerce demo (Next.js + Postgres)

A full‑stack shop with a **customer storefront** and an **admin dashboard**. The frontend uses Next.js; products, orders, and users are stored in a **PostgreSQL** database (this repo is set up for **Neon**).

---

## Try the live site

| Area  | Link                                                                            |
| ----- | ------------------------------------------------------------------------------- |
| Store | [Open storefront](https://next-js-e-commerce-project.onrender.com/modules/user) |
| Admin | [Open admin](https://next-js-e-commerce-project.onrender.com/modules/admin)     |

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
| **RabbitMQ (optional)**          | Background jobs (email + inventory after payment)    |
| **Cloudinary (optional)**        | Image hosting for uploads                            |
| **Node.js 20+**                  | Runtime (local + deployment)                         |

---

## How the folders are laid out

**Frontend** lives under `src/app/`.

- **`modules/user/`** — Everything for shoppers: pages, UI, and APIs under `/modules/user/...`.
- **`modules/admin/`** — Same idea for staff: dashboard and APIs under `/modules/admin/...`.

Inside each module, roughly:

| Folder        | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `(routes)/`   | Page components                                             |
| `api/`        | Server routes (REST handlers)                               |
| `client/`     | Browser code that calls those APIs (+ auth session wrapper) |
| `domain/`     | Plain rules (calculations, mapping) with no UI              |
| `components/` | React UI                                                    |
| `hooks/`      | Reusable React logic                                        |
| `lib/`        | Small helpers for that module                               |

Shared code used by both modules is in **`src/app/lib/`** (with compatibility aliases under **`src/app/utils/`**). Cart state is in **`src/app/redux/`**.

**Backend** logic (database access, business rules) is in **`src/backend/modules/`** — separate from the React tree. New imports should prefer **`src/backend/core/`** aliases; legacy **`src/backend/lib/`** paths are still available for compatibility.

**`src/middleware.ts`** — Runs on requests first (session cookie refresh and security checks).

### Import conventions

- Prefer **`@/app/utils/*`** for shared app-layer helpers (HTTP/auth/query aliases).
- Prefer **`@/backend/core/*`** for backend shared utilities (session, money, guards, auth aliases).
- Keep **`@/app/lib/*`** and **`@/backend/lib/*`** only for backward compatibility while migrating older files.

Examples:

```ts
import http from "@/app/utils/http";
import { authOptions } from "@/app/utils/auth";
import { resolveUserId } from "@/backend/core/session";
import { moneyToNumber } from "@/backend/core/money";
```

### Frontend → Backend Workflow (Basic Flow)

```
Browser UI
  ↓
Client HTTP Wrappers
  ↓
App Utils HTTP Layer
  ↓
Next.js Route Handlers
  ↓
Backend Services
  ↓
Backend Repositories
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
├─ lib/           # shared helpers, HTTP client, validators
├─ utils/         # compatibility aliases that mirror lib/
├─ modules/
│  ├─ user/       # storefront: (routes)/, api/, client/, domain/, …
│  └─ admin/      # dashboard: same pattern
├─ redux/         # cart store
└─ layout.tsx     # root layout

src/backend/
├─ core/          # canonical alias entrypoints (preferred import path)
├─ lib/           # legacy paths kept for compatibility
└─ modules/       # features: services, repos, actions
```

</details>

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
# Defaults to MYR
PAYPAL_CURRENCY="MYR"
NEXT_PUBLIC_PAYPAL_CURRENCY="MYR"

# Email (order receipts, password reset)
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM=""
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="1"

REDIS_URL="redis://..."
# RabbitMQ (optional): PayPal capture posts to two durable queues — receipt email + inventory.
# If unset, email + stock decrement run inline in the API route.
RABBITMQ_URL="amqp://..."
RABBITMQ_QUEUE_ORDER_EMAIL="order.email"
RABBITMQ_QUEUE_ORDER_INVENTORY="order.inventory"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

**On Render:** copy the same keys into the dashboard. Set **`NEXTAUTH_URL`** to your production URL. Add OAuth redirect URLs in Google/Facebook (see below).

### RabbitMQ (optional) — paid orders

When **`RABBITMQ_URL`** is set, the PayPal **capture** route creates the DB order **without** decrementing stock, then enqueues:

| Queue (default name) | Purpose                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `order.email`        | Send receipt email (same content as sync path; worker should use your SMTP / `sendTransactionalEmail`). |
| `order.inventory`    | Decrement `Product.stock` per line (mirror `decrementStockForOrderLinesRepo` in `order.repo.ts`).       |

Message body is JSON with `v: 1`. **Email:** `{ v, orderId, to, subject, text }`. **Inventory:** `{ v, orderId, lines: [{ productId, quantity }] }`.

If enqueue fails (broker down), the API **falls back** to synchronous stock decrement + email so the customer is not left with wrong inventory.

Without **`RABBITMQ_URL`**, behavior stays fully synchronous (email + inventory in the request).

**Later:** you can add separate queues for payment webhooks or analytics the same way (e.g. `order.payment`, `order.analytics`).

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

| Command             | Meaning                          |
| ------------------- | -------------------------------- |
| `npm run lint`      | Check code style                 |
| `npm run lint:fix`  | Fix style in `src/`              |
| `npm run format`    | Format with Prettier             |
| `npm run clean`     | Delete `.next` (safe on Windows) |
| `npm run dev:clean` | Clean then start dev             |

**Helpers:**

- `tsx scripts/seed.ts` — seed data
- `tsx scripts/check.ts` — inspect DB

---

## Product lists (pagination)

Lists use **cursor pagination** (by product id) so “Load more” stays fast and stable.

Example endpoints:

- Store: `GET /modules/user/api/products?limit=10&cursor=<lastId>`
- Admin: `GET /modules/admin/api/products?limit=20&cursor=<lastId>`

Response shape includes items and a `nextCursor` when more pages exist.

---

## Live updates (SSE)

The admin area can open **SSE** streams under `/modules/admin/api/events/...` so lists refresh when data changes elsewhere. If SSE fails, the UI falls back to polling. The storefront uses a similar pattern where needed.

---

## Support chat (Amazon-style, no websocket)

- **User page**: `GET /modules/user/support/chat` (polling)
- **Admin page**: `GET /modules/admin/support/chats` (polling)

APIs:

- User: `GET/POST /modules/user/api/support/conversations`
- User: `GET/POST /modules/user/api/support/conversations/[id]/messages`
- Admin: `GET /modules/admin/api/support/conversations`
- Admin: `GET/POST /modules/admin/api/support/conversations/[id]/messages`

---

## Coupons & vouchers

Supports Amazon-style vouchers:

- **Public vouchers**: can be shown on storefront and used by anyone.
- **Targeted vouchers**: require sign-in and must be assigned to selected users (bulk assign from admin users page).

Storefront vouchers API: `GET /modules/user/api/coupons/vouchers`

---

## Orders

- User order list: `/modules/user/orders`
- User order detail: `/modules/user/orders/[id]` (items + images, shipping snapshot, PayPal ids, receipt email snapshot)

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
   `https://next-js-e-commerce-project.onrender.com/modules/user/api/auth/callback/google`

**Facebook**

1. [Facebook Developers](https://developers.facebook.com/) → your app → Facebook Login.
2. Add redirect URI:  
   `https://next-js-e-commerce-project.onrender.com/modules/user/api/auth/callback/facebook`
