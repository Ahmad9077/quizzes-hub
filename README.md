# Quizzes Hub

Public URL:

`https://ahmad9077.github.io/quizzes-hub/`

Quizzes Hub is now structured as a private quiz dashboard:

- username/password login
- user profiles
- per-user quiz assignments
- admin view for creating users and assigning quizzes
- progress tracking from the quiz websites

## Visual identity

The Hub's pages share one look: a wall of soft facets (`--facets` in `styles.css`), a wooden shelf under it, a white page below, and activities as books standing on shelves. The sign-in page writes only the site's name, the six school subjects and the sign-in fields. Each activity's book colour and cover are `book`, `cover` and `lightBook` in `quizCatalog`; `color` stays as it is in the `quizzes` table and nothing on screen reads it. The stories list and the Quran pages use the same wall and colours in their own stylesheets (the verse fonts do not change). Quiz sites and the story reader keep their own designs.

`tests/identity.cjs` drives the sign-in page, the shelf, Challenge and Admin on the stand-in backend at phone, tablet and computer sizes.

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
