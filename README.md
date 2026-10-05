# Espresso

Fast, reliable, clean real-time messaging.

Espresso is a real-time messaging app built on **Next.js (App Router)**,
**Supabase** (Auth, Postgres, Realtime, Storage) and deployed on **Vercel**.
It is deliberately focused: excellent messaging and a small set of useful
communication features, with a security model that is enforced in the database,
not just the UI.

> `docs/ESPRESSO_SPEC.md` is the canonical product & technical specification.
> Read it before implementing or changing anything.

## Feature set
Account creation (email, name, unique User ID, password) · numeric recovery
code · sign in/out · password + account recovery · User-ID search · real-time
text messaging · live typing indicator · swipe-to-reply · image messaging with
client-side compression · location sharing · per-user chat deletion ·
server-enforced blocking · responsive mobile + desktop UI.

## Tech
- **Next.js 14** App Router, TypeScript, Tailwind CSS
- **Supabase** Auth, Postgres + RLS, Realtime, Storage
- **Vercel** for deployment
- `@supabase/ssr` for cookie-based sessions

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev                  # http://localhost:3000
```

### 1. Create the Supabase project
1. Create a project at https://supabase.com/dashboard.
2. Open the **SQL Editor** and run the contents of **`supabase/setup.sql`**
   (or apply `supabase/migrations/*` with the Supabase CLI).
3. In **Authentication → Providers → Email**, enable Email. For local
   development you can disable *Confirm email* so signup signs you straight in.

### 2. Configure environment
Copy `Project Settings → API` values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, used by /api/recover
```

The service-role key is used **only** by the server route that completes a
recovery-code password reset. It must never be exposed to the browser.

### 3. Run
`npm run dev`, open the app, create an account, and generate your recovery code
when prompted.

## Scripts
| command | purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm run start` | run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

## Project structure
```
app/            routes: auth pages, /chat, /api/recover
components/     ui/ (primitives), chat/, auth/, settings/
features/       messaging, typing-indicator, swipe-to-reply, image-sharing,
                location-sharing, blocking, user-search, authentication
lib/            supabase clients, utils, formatting, error mapping
styles/         theme + globals + per-area styles
types/          database + app types
supabase/       migrations + one-shot setup.sql
docs/           ESPRESSO_SPEC, DATABASE, SECURITY, FEATURES, UI_GUIDELINES
```

## Deploy (Vercel)
1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Add the three environment variables from `.env.local`.
4. Deploy. Add your Vercel domain to Supabase **Authentication → URL
   Configuration** (Site URL + redirect URLs) so email links work.

## Design
The visual identity lives in `styles/theme.css` and `tailwind.config.ts`.
Change those to restyle the whole product. Espresso takes UX inspiration from
Telegram and iMessage but is intentionally its own product.
