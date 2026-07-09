# Literature Stock App

This version supports two modes:

1. Local demo mode when Supabase environment variables are not configured.
2. Shared Supabase mode when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

## Local run

```bash
npm install
npm run dev
```

## Supabase setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run `supabase/schema.sql`.
4. Go to Project Settings → API.
5. Copy the Project URL and anon public key.
6. Add them to Vercel as environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Redeploy on Vercel.

## Auth notes

The app uses Supabase email/password authentication. For a small private group, create accounts from the app or create users manually in Supabase Authentication.

## Image notes

Literature cover images are uploaded to the public `literature-images` Supabase Storage bucket created by the schema.
