# haya-nt3lm.com

`haya-nt3lm.com` shows the Quizzes Hub and its quiz sites from the same GitHub Pages files.
The GitHub addresses (`ahmad9077.github.io/...`) keep working and are **not** redirected.

- `haya-nt3lm-worker.js` — Cloudflare Worker `haya-nt3lm-hub` on the account `cb8327c64dd8aba791c042b403b7e766`.
  `/` is the Hub (`/quizzes-hub/`); `/<quiz-site>/` are the Hub's quiz sites (listed in `SITES`).
  GitHub addresses inside pages and scripts are rewritten to this domain, so the Hub and its quizzes
  share one address and therefore one sign-in. Other GitHub Pages sites are not served here.
- A new quiz site must be added to `SITES` and deployed: `cd cloudflare && npx wrangler deploy`.
- The `admin-users` Edge Function allows both addresses (CORS).
- Sign-ins are kept per address: each person signs in once on the new address.
