## E‑Commerce (Next.js) — Basic Stack and Neon Postgres

### Tech Stack

- **Next.js 15** (App Router, Route Handlers)
- **TypeScript**
- **Prisma** ORM (provider: `postgresql`)
- **NextAuth.js** (+ Prisma Adapter)
- **Redux Toolkit** + **redux-persist**
- **SWR** for data fetching
- **Socket.IO** for realtime updates
- **Tailwind CSS v4** (via `@tailwindcss/postcss` + PostCSS)
- **Zod** for validation
- **Cloudinary** for media uploads
- **Node.js 20** runtime

### Prerequisites

- Node.js 20+
- npm (or pnpm/yarn)
- A Neon Postgres database

### Environment

Create `.env` (or `.env.local`) in the project root:

```bash
# Neon Postgres — primary connection
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>/<DATABASE>?sslmode=require"

# Example (non-pooled):
# postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Optional: use Neon pooled endpoint (recommended for serverless):
# DATABASE_URL="postgresql://<USER>:<PASSWORD>@ep-xxxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
```

Prisma datasource is configured to use `provider = "postgresql"` and reads `DATABASE_URL`.

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

# Prod (custom Next.js + Socket.IO server)
npm start
```

Scripts available:

- `npm run dev` → Next.js dev server
- `npm run build` → Next.js build
- `npm start` → starts custom server at `src/lib/socket/server.js` (with Socket.IO)
- `npm run lint` → ESLint

Utilities:

- Seed DB: `node scripts/seed-db.js`
- Check DB contents: `node scripts/check-db.js`

### Notes

- If you change the database schema, create a new migration and apply it:
  ```bash
  npx prisma migrate dev --name <change>
  ```
- Ensure Neon uses SSL (`sslmode=require`). For pooled connections, prefer the `-pooler` host and add `pgbouncer=true`.
