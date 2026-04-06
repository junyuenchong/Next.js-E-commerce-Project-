## E‑Commerce (Next.js) — Basic Stack and Neon Postgres

### 🌐 Live Demo

**Production URLs:**

- **User Interface**: [https://next-js-e-commerce-project.onrender.com/user](https://next-js-e-commerce-project.onrender.com/user)
- **Admin Dashboard**: [https://next-js-e-commerce-project.onrender.com/admin](https://next-js-e-commerce-project.onrender.com/admin)

### Tech Stack

- **Next.js 15** (App Router, Route Handlers)
- **TypeScript**
- **Prisma** ORM (provider: `postgresql`)
- **NextAuth.js** (+ Prisma Adapter)
- **Redux Toolkit** + **redux-persist**
- **SWR** for data fetching
- **Redis** for caching hot data
- **RabbitMQ** (via `amqplib`) for async business events
- **Tailwind CSS v4** (via `@tailwindcss/postcss` + PostCSS)
- **Zod** for validation
- **Cloudinary** for media uploads
- **Node.js 20** runtime

### Project Structure (Frontend & Backend)

#### App / UI (`src/app`)

- `src/app/layout.tsx` – root HTML shell + global providers (Redux, Tailwind).
- `src/app/page.tsx` – redirects `/` → `/user`.
- `src/app/api/**/route.ts` – App Router API routes (e.g. `upload`).
- `src/app/user/**`
  - `layout.tsx`, `page.tsx`, `loading.tsx` – user storefront shell and entry.
  - `api/**/route.ts` – user-facing APIs (cart, products, categories, session, logout).
  - `components/**` – all user UI (header, product list, product card, cart sidebar, etc.).
  - `hooks/**` – user UI hooks (e.g. `useCart`, `useUser`).
- `src/app/admin/**`
  - `layout.tsx`, `page.tsx`, `loading.tsx` – admin shell and entry.
  - `api/**/route.ts` – admin APIs (products, categories, batch delete, SSE events).
  - `components/**` – admin UI (sidebar, product & category management).
  - `hooks/**` – admin UI hooks (product list, category manager, SSE hook).

#### Backend (Controllers & Domain Logic)

- `src/actions/**`
  - Thin **controllers / server actions** that:
    - validate input using Zod schemas,
    - call domain services in `src/modules/**`,
    - handle cache invalidation (`revalidatePath`, Redis keys),
    - publish domain events (RabbitMQ, Redis pub/sub).
  - Examples:
    - `actions/product.ts` – product CRUD/search.
    - `actions/category.ts` – category CRUD/search.
    - `actions/cart.ts` – cart operations + merge logic entrypoint.
    - `actions/auth.ts` – custom session, login, logout, register.

- `src/modules/**`
  - **Domain services + repositories**, one folder per domain:
    - `modules/product/*` – product service + Prisma repository.
    - `modules/category/*` – category service + Prisma repository.
    - `modules/cart/*` – cart service + Prisma repository (user + guest carts, merge).
    - `modules/auth/*` – auth/session service + Prisma repository.
  - Services contain **business rules**; repositories contain **Prisma-only DB code**.
  - UI and API routes never import repositories directly; they always go through `actions/*`.

#### Shared Utilities

- `src/lib/prisma.ts` – Prisma client.
- `src/lib/redis.ts` – Redis client + JSON helpers.
- `src/lib/rabbitmq.ts` – RabbitMQ connection + event publisher.
- `src/lib/hooks/useRealtimeSWR.ts` – SWR + SSE integration for realtime updates.
- `src/lib/validators/**` – Zod schemas (product, category, cart).
- `src/lib/utils/utils.tsx` – small shared helpers.

#### Middleware

- `src/middleware.ts`
  - Renews custom session cookie on GET.
  - Performs basic CSRF protection (Origin vs Host check).
  - Applied globally via Next.js middleware matcher.

### Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- A Neon Postgres database

### Environment Variables

Create `.env` (or `.env.local`) in the project root:

```bash
# Database
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>/<DATABASE>?sslmode=require"

# Authentication
NEXTAUTH_URL="http://localhost:3002"  # Production: https://next-js-e-commerce-project.onrender.com
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# Redis (Optional but recommended)
REDIS_URL="redis://default:<PASSWORD>@localhost:6379/0"

# RabbitMQ (Optional, for async business events)
RABBITMQ_URL="amqp://guest:guest@localhost:5672/"

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**Production Environment Variables in Render:**

- Set all variables in Render dashboard
- Use production URLs for OAuth callbacks
- Ensure database connection is working

### Install and Setup

```bash
npm install

# Generate Prisma Client
npx prisma generate

# Apply existing migrations (recommended for existing schema)
npx prisma migrate deploy

# (Optional) Seed sample data
node scripts/seed-db.js
```

### Run

```bash
# Dev (Next.js)
npm run dev

# Prod (Next.js)
npm start
```

Scripts available:

- `npm run dev` → Next.js dev server
- `npm run build` → Next.js build
- `npm start` → Next.js production server
- `npm run lint` → ESLint

Utilities:

- Seed DB: `node scripts/seed-db.js`
- Check DB contents: `node scripts/check-db.js`

### Deployment

**Render Deployment:**

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Configure OAuth providers (Google, Facebook)
4. Deploy automatically on git push

**Build Commands:**

- **Build**: `npm install && npx prisma generate && npm run build`
- **Start**: `npm start` (Next.js production server)

### Development Notes

- If you change the database schema, create a new migration:
  ```bash
  npx prisma migrate dev --name <change>
  ```
- Ensure Neon uses SSL (`sslmode=require`)
- For pooled connections, use `-pooler` host with `pgbouncer=true`

### OAuth Setup

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://next-js-e-commerce-project.onrender.com/api/auth/callback/google`

**Facebook OAuth:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create app and add Facebook Login
3. Add redirect URI: `https://next-js-e-commerce-project.onrender.com/api/auth/callback/facebook`
