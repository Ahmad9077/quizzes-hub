# Deema hadith — 2026-10-10

Existing quran-deema activity renamed to القرآن والأحاديث - ديما. Assignment ID and URL remain stable. Migration 015 changes only its catalog title. No child assignment or profile writes.

Home: Quran section (Fatiha + Nas) and a distinct الأحاديث section with exactly one user-selected hadith. The hadith is a separate document guarded by quran-deema even if a visitor changes the group query. No Quran text files or recitation recordings changed.

Text: the user's exact wording with full tashkeel and normalized punctuation; no added hadith or explanation. Verified against Sahih Ibn Hibban 863, volume 3 pp.144–145: https://ablibrary.net/book_content/b/18945/144 and https://ablibrary.net/book_content/b/18945/145. The p.145 editor note states إسناده قوي, attributed to Shuayb al-Arnaut. Other sources use رسولا; the chosen Ibn Hibban wording preserves نبيا supplied by the user.

Audio: ElevenLabs eleven_v4, existing library voice Hamid (A9ATTqUUQ6GHu0coCz8t), Arabic language override, one generation. 10.64 seconds, API header character-cost 9 (provider units, not a currency estimate). No new subscription or credits purchased. API key remained in macOS Keychain, never copied into repository or browser code. No child audio or account data sent. Only the public hadith text was submitted. Static audio does not call ElevenLabs when played.

QA: tests/hadith.cjs checks five viewport sizes, complete text and bounds, home grouping, hide/reveal, actual WebKit media playback, stop, failed media, sign-out and wrong-group denial. This proves mechanical playback, not a qualified human pronunciation review. Ask Ahmad to listen to the first recording before using it for memorization; no claim of scholar/human audio approval.

Rollback: revert release frontend and restore quran-deema title if needed; keep its ID, assignments and Quran bookmarks. No data migration required.
