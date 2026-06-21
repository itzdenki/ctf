# CTF Platform

Next.js CTF platform with player challenge board, scoreboard, team auth, CTFtime OAuth, Supabase-backed data, and a hidden organizer admin panel.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the Next.js app:

   ```bash
   npm run dev
   ```

3. Open http://localhost:3000.

## Backend Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create a private Storage bucket named `challenge-files` if the SQL insert did not create it.
4. Copy `.env.example` to `.env.local` and fill:

   ```bash
   SUPABASE_URL=
   SUPABASE_SERVICE_ROLE_KEY=
   APP_URL=http://localhost:3000
   INITIAL_ADMIN_USERNAME=admin
   INITIAL_ADMIN_PASSWORD=change-this
   CTFTIME_CLIENT_ID=
   CTFTIME_CLIENT_SECRET=
   DISCORD_FIRST_BLOOD_WEBHOOK_URL=
   DISCORD_FIRST_BLOOD_WEBHOOK_USERNAME="CTF First Blood"
   ```

5. Visit `/admin`. If the `admins` table is empty, the first successful login with `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` creates the first admin.

Player data is loaded from `/api/bootstrap`; flags are only returned from admin APIs.
