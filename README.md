## E‑Commerce (Next.js) — App Router + Neon Postgres

### Live Demo

**Production URLs:**

- **User Interface**: [https://next-js-e-commerce-project.onrender.com/user](https://next-js-e-commerce-project.onrender.com/user)
- **Admin Dashboard**: [https://next-js-e-commerce-project.onrender.com/admin](https://next-js-e-commerce-project.onrender.com/admin)

### Tech Stack

- **Next.js 15** (App Router, Route Handlers)
- **TypeScript**
- **Prisma** ORM (provider: `postgresql`)
- **NextAuth.js** (+ Prisma Adapter)
- **Redux Toolkit** + **redux-persist**
- **TanStack React Query** for data fetching/caching
- **Redis** for caching hot data
- **RabbitMQ** (via `amqplib`) for async business events
- **Tailwind CSS v4** (via `@tailwindcss/postcss` + PostCSS)
- **Zod** for validation
- **Cloudinary** for media uploads
- **Node.js 20** runtime

### Project Structure

#### Frontend (App Router)

```txt
src/
├─ app/                        # Next.js App Router (UI + route handlers)
│  ├─ admin/                   # Admin dashboard UI + admin pages
│  ├─ user/                    # User storefront UI + user pages
│  └─ api/                     # Route handlers (upload, SSE events, etc.)
│
├─ redux/                      # Redux store + persisted cart slice
│  ├─ ReduxProvider.tsx
│  ├─ store.ts
│  └─ slices/
│     └─ cartSlice.ts
│
└─ middleware.ts               # Session refresh + CSRF checks
```

#### Backend (Controllers + Modules)

```txt
src/
├─ actions/                   # Controllers (server actions)
│  ├─ product.ts             # Product CRUD/search + cache invalidation + events
│  ├─ category.ts            # Category CRUD/search + cache invalidation + events
│  ├─ cart.ts                # Cart operations + merge entrypoint
│  └─ auth.ts                # Login/logout/register/session helpers
│
├─ modules/                   # Feature modules (Services + Repositories)
│  ├─ product/
│  │  ├─ product.service.ts
│  │  └─ product.repository.ts
│  │
│  ├─ category/
│  │  ├─ category.service.ts
│  │  └─ category.repository.ts
│  │
│  ├─ cart/
│  │  ├─ cart.service.ts
│  │  └─ cart.repository.ts
│  │
│  └─ auth/
│     ├─ auth.service.ts
│     └─ auth.repository.ts
│
├─ lib/                        # Shared infrastructure
│  ├─ prisma.ts
│  ├─ redis.ts
│  ├─ rabbitmq.ts
│  ├─ hooks/
│  │  └─ useRealtimeQuery.ts
│  ├─ query-keys.ts           # TanStack query keys (qk.*)
│  ├─ cache-keys.ts           # Redis key helpers (cacheKeys.*)
│  └─ validators/
│     ├─ product.ts
│     ├─ category.ts
│     └─ cart.ts
│
└─ cqrs/                      # (Optional) not used directly here
```

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
- `npm run lint` → ESLint (Next wrapper)
- `npm run lint:fix` → ESLint fix (scoped to `src/`)
- `npm run format` → Prettier write
- `npm run clean` → remove `.next` safely on Windows
- `npm run dev:clean` → clean + dev

Utilities:

- Seed DB: `node scripts/seed-db.js`
- Check DB contents: `node scripts/check-db.js`

### Pagination (Performance)

Product lists use **cursor pagination** (by `Product.id`) for fast, stable "Load More" behavior.  
The API supports:

- `GET /user/api/products?limit=10&cursor=<lastId>` → `{ items, nextCursor }`
- `GET /admin/api/products?limit=20&cursor=<lastId>` → `{ items, nextCursor }`

There are composite DB indexes in Prisma migrations to support this efficiently (e.g. `Product(categoryId, id)`).

### Realtime (SSE)

Admin product/category pages subscribe to SSE endpoints under `src/app/admin/api/events/**` and trigger React Query invalidation via `useRealtimeInvalidate`. User-facing lists/details use `useRealtimeQuery` with a polling fallback when SSE is unavailable.

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
