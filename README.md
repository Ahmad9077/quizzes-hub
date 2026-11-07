# Quizzes Hub

Public URL:

`https://ahmad9077.github.io/quizzes-hub/`

Quizzes Hub is now structured as a private quiz dashboard:

- username/password login
- user profiles
- per-user quiz assignments
- admin view for creating users and assigning quizzes
- progress tracking from the quiz websites

## Groups

The Admin page has three tabs: groups, users, activity. A group holds members and activities, and every
member gets the group's activities; an account can also have activities of its own.

Triggers keep `quiz_assignments` filled from the groups (`supabase/migrations/026_admin_groups.sql`), so the
access guard, dashboard, progress rules, adaptive engine and Challenge Mode keep reading that table unchanged.
`quiz_assignments.direct` marks what the Admin gave the account itself; a row with `direct = false` exists only
because of a group. `admin_set_assignments` saves an account's own list and leaves its group activities alone.

Tests: `tests/admin-groups-sql.mjs` runs the rules on Postgres (PGlite) and `tests/admin-groups.cjs` drives the page
on made-up accounts (`tests/admin-groups-mock.js`). `tests/make-admin-preview.cjs` writes a preview of it.

## Backend Requirement

This cannot be secured by GitHub Pages alone. It requires Supabase.

The app will show a setup screen until `config.js` contains a real Supabase project URL and anon key.

## Supabase Setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run:

   `supabase/schema.sql`

3. Create the first admin Auth user in Supabase Dashboard.

   Use an email like:

   `admin@users.quizzeshub.local`

4. Copy the new Auth user's UUID and run the bootstrap insert at the bottom of `supabase/schema.sql`.

5. Deploy the Edge Function:

   `supabase/functions/admin-users/index.ts`

   The function needs these environment variables in Supabase:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

6. Update `config.js`:

   ```js
   window.QUIZZES_HUB_CONFIG = {
     supabaseUrl: "https://YOUR_PROJECT_REF.supabase.co",
     supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
   };
   ```

7. Commit and deploy `config.js`.

## Quiz Progress

The separate quiz websites load:

- `https://ahmad9077.github.io/quizzes-hub/config.js`
- `https://ahmad9077.github.io/quizzes-hub/progress-client.js`

When the user is signed in from Quizzes Hub, completed quiz rounds insert into `quiz_progress`.
