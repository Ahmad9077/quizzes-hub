# Quran groups release checkpoint — 2026-10-09

Status: migration 014 applied and independently verified on 2026-10-10. Frontend release is ready for publication; see deployment evidence for final live status. No assignment writes performed.
Worktree: quran-hub-release. Branch: release/quran-groups.
Production base: a3935aa5a10db4955d7d7d49ac352f1469bfbcc1.

Requested catalog:
- quran-al-balad → القرآن الكريم - حمود → quran/?group=hamoud → 90,89,88,87,86,85,84.
- quran-deema → القرآن الكريم - ديما → quran/?group=deema → 1,114.
Keep existing assignments. Do not assign either activity automatically.

Resolved on 2026-10-10 after user sign-in. Historical blocker: Supabase dashboard session expired; GitHub OAuth sign-in also needs user login. No authenticated Supabase CLI or DB URL is available. Browser Chrome profile Your Chrome has a Quran groups tab awaiting sign-in; Mac native UI is locked, but the browser extension works. No credentials were read, entered, or changed.

After the user completes sign-in:
1. Open project eqzhjjpazzsovabsqemc SQL editor, a fresh blank query.
2. Read baseline: catalog entries for the two IDs, counts of profiles, quiz_assignments, quiz_progress, and assignment counts per Quran ID. Do not output child identifiers.
3. Execute supabase/migrations/014_quran_groups.sql exactly (catalog-only transaction).
4. Separate fresh query verifies both titles/URLs and preserved assignment/profile counts. Do not auto-assign Deema.
5. Check origin/main still equals the base (fetch first); if changed, review/rebase safely before release.
6. Commit any deployment evidence and push non-force HEAD:main. Verify GitHub Pages latest build matches release commit and status built. Verify live changed assets and both group routes, using isolated auth fixtures for group screens; anonymous must redirect to Hub.
7. Report actual live result and manual Admin selection. Until then do not claim deployed or selectable in live Admin.

Verification complete:
- tests/quran-release.cjs: both groups, 172 original verses across five viewports (860 verse layout checks), bookmark restoration, sign-out, wrong-group denial, no out-of-group hash rendering, isolated Hub tiles/checkboxes, real provider metadata refresh/rejection.
- tests/quran-fatiha-audio.cjs: original Alafasy full Fatiha and Nas actual WebKit playback, one basmala, text hidden, max one concurrent track, Balad intro regression, audio failure keeps reading.
- tests/quran-group-admin.cjs: exact group labels, independent checkbox selection payloads, old selection retained, empty defaults, privacy back-links preserve Deema.
- Syntax checks, git diff --check (verbatim Tanzil source notice excluded), shared auth/progress/story files unchanged.
These use isolated account fixtures; no physical iPhone or child testing claimed.

No local server or automatic continuation is required. To resume local testing: python3 -m http.server 8871 --bind 127.0.0.1, then run test with PLAYWRIGHT_MODULE=/Users/macserver/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright.

## Database verification — 2026-10-10
Migration 014 returned Success. Separate committed-state query showed both exact group titles and URLs. Before/after counts unchanged: profiles 9, assignments 46, progress 228, Hamoud assignments 2, Deema assignments 0. No authentication, RLS, profile, progress or assignment changes.
