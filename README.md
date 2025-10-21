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
- **Socket.IO** for realtime updates
- **Tailwind CSS v4** (via `@tailwindcss/postcss` + PostCSS)
- **Zod** for validation
- **Cloudinary** for media uploads
- **Node.js 20** runtime

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

# WebSocket (Production)
NEXT_PUBLIC_RENDER_URL="https://next-js-e-commerce-project.onrender.com"

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

### Deployment

**Render Deployment:**

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Configure OAuth providers (Google, Facebook)
4. Deploy automatically on git push

**Build Commands:**

- **Build**: `npm install && npx prisma generate && npm run build`
- **Start**: `npm start`

### Development Notes

- If you change the database schema, create a new migration:
  ```bash
  npx prisma migrate dev --name <change>
  ```
- Ensure Neon uses SSL (`sslmode=require`)
- For pooled connections, use `-pooler` host with `pgbouncer=true`
- WebSocket connections use custom server on port 3002 (development)

### OAuth Setup

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://next-js-e-commerce-project.onrender.com/api/auth/callback/google`

**Facebook OAuth:**

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create app and add Facebook Login
3. Add redirect URI: `https://next-js-e-commerce-project.onrender.com/api/auth/callback/facebook`
