# Project: Quizzes Hub

## What this project is
Quizzes Hub is a public GitHub Pages landing app that gives each child a private quiz dashboard after username/password login.
It is used by an admin account to create child profiles, assign quizzes, and review recent quiz progress from the separate quiz websites.

## Tech stack
- Static frontend: HTML, CSS, and vanilla JavaScript
- Auth/data backend: Supabase Auth, Postgres, Row Level Security, RPC functions, and an Edge Function
- Client library: `@supabase/supabase-js@2` loaded from jsDelivr
- Edge Function runtime: Deno TypeScript, importing Supabase JS from `esm.sh`
- Hosting: GitHub Pages at `https://ahmad9077.github.io/quizzes-hub/`

## How to run and test
- Install: no package install is required
- Run: open `index.html`, or serve locally with `python3 -m http.server 8000`
- Test: `node -e "new Function(require('fs').readFileSync('config.js','utf8')); new Function(require('fs').readFileSync('progress-client.js','utf8')); new Function(require('fs').readFileSync('script.js','utf8')); console.log('syntax ok')"` and `git diff --check`

## Conventions
- Keep the app build-free: plain files in the repo root are deployed directly by GitHub Pages.
- Keep quiz definitions synchronized between `script.js` and `supabase/schema.sql`.
- Use `textContent`, `replaceChildren`, and created DOM nodes for user-controlled data; do not interpolate profile/progress data with `innerHTML`.
- When changing `config.js`, `script.js`, `styles.css`, or `progress-client.js`, bump the matching query string in `index.html` or dependent quiz sites so GitHub Pages/browser caches refresh.
- `config.js` may contain the public Supabase URL and publishable key only. Never put service-role/secret keys in frontend files or commits.
- `progress-client.js` is loaded by separate quiz repositories and should keep a stable `window.QuizzesHubProgress.record(...)` API.
- The admin Edge Function creates Supabase Auth users using internal emails like `<username>@users.quizzeshub.local`; the user-facing login remains username/password.

## Sensitive areas (be extra careful)
- `supabase/schema.sql`: RLS policies, `is_admin()`, `resolve_login()`, `admin_delete_user()`, seeded quiz IDs, and `quiz_progress` assignment checks.
- `supabase/functions/admin-users/index.ts`: admin authorization, service/secret key handling, Auth user creation, cleanup on partial failures, and CORS behavior.
- `script.js`: username resolution, login/session handling, admin visibility, assignment saves, and progress/profile rendering.
- `progress-client.js`: cross-site progress writes from quiz pages; mistakes affect all connected quizzes.
- `config.js`: public backend connection values; safe for publishable keys, unsafe for secret keys.
- GitHub Pages cache query strings in `index.html` and the separate quiz repos.
- Supabase dashboard settings for the `admin-users` function, especially JWT verification and default function secrets.

## When to consult Claude Code on THIS project
In addition to the global rules, always consult Claude Code before changing:
- Supabase RLS policies, `is_admin()`, `resolve_login()`, `admin_delete_user()`, or table relationships in `supabase/schema.sql`
- The `admin-users` Edge Function, especially auth checks, secret-key handling, CORS, or user cleanup logic
- Quiz assignment or progress-tracking logic that affects what children can access or what results are recorded
- Username/password login flow, admin role gating, or any code that determines whether the Admin UI is visible
- Live deployment/configuration changes involving Supabase project keys, function settings, or GitHub Pages cache-busting across the hub and quiz sites
