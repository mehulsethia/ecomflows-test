# Ecomflows Demo

Next.js (App Router) demo with Tailwind, Inter, Supabase, and a Klaviyo → Supabase sync sample.

## Quick start

```bash
npm install
npm run dev
```

Visit `/login`, `/dashboard`, `/stores`, etc.

## Environment

Set these before running the API sample:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `KLAVIYO_API_KEY`

## Supabase table

Create a table `flow_metrics` with columns:

- `id` uuid primary key (default `uuid_generate_v4()`)
- `store_id` text
- `raw` jsonb
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now() (via trigger or app logic)

## API demo

`POST /api/sync` with JSON `{ "storeId": "store_123" }`:

1. Fetches Klaviyo flows with `KLAVIYO_API_KEY`.
2. Saves payload to Supabase `flow_metrics.raw` with the provided `store_id`.
3. Returns a JSON confirmation. Error responses return `{ error: "message" }` with status 400/500.

## Auth (Supabase)

- Login lives at `/login` and signup at `/register`.
- OAuth buttons call `supabase.auth.signInWithOAuth` (GitHub/Google by default). Enable providers in Supabase Auth and add redirect URLs pointing to your site (e.g., `http://localhost:3000` for dev).
- Email/password signup uses `supabase.auth.signUp`; Supabase sends confirmation emails. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for auth to work.
