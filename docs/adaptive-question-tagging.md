# Adaptive Engine — Question Tagging Guide

## Required fields on every public quiz question object

```js
{
  key:        "flag_brazil",          // REQUIRED — stable string ID, never rename

  // ... existing fields unchanged (image, choices, answer, etc.)
}
```

`key` must be unique within a quiz and must never change once published — it is the
stable identifier used in analytics and server-side selection.

Do not put difficulty levels or weak-topic labels in the public quiz JavaScript.
Those labels belong in `public.question_difficulty_profiles` in Supabase so only
the admin/backend can see and use them.

---

## Difficulty calibration guide (1–100)

| Band    | Range  | Description                                      |
|---------|--------|--------------------------------------------------|
| Starter | 1–20   | Major countries, obvious symbols, common words   |
| Easy    | 21–35  | Common knowledge, clear visual cues              |
| Medium  | 36–55  | Moderate knowledge required                      |
| Hard    | 56–75  | Less common, requires study                      |
| Expert  | 76–90  | Obscure, confusable, requires deep knowledge     |
| Master  | 91–100 | Very rare / highly confusable content            |

The engine starts every user at level 50 and moves in both directions.
Questions in the full 1–100 range give the engine room to work.
Aim for roughly 10–15 questions per 10-point band.

---

## Topic tag conventions

Tags are content descriptors, not progress labels. Keep them lowercase snake_case.

**World Flags quiz examples:**
- `"south_america"`, `"north_america"`, `"europe"`, `"africa"`, `"asia"`, `"oceania"`
- `"island_nation"`, `"landlocked"`, `"tricolour"`, `"cross_flag"`

**Country Map quiz examples:**
- `"europe"`, `"asia"`, `"africa"`, `"americas"`, `"island_nation"`, `"coastal"`

**Spelling quiz examples:**
- `"silent_letter"`, `"double_letter"`, `"irregular_plural"`, `"common_word"`, `"homophones"`

**Picture Reading quiz examples:**
- `"animals"`, `"food"`, `"objects"`, `"actions"`, `"colours"`, `"numbers"`

---

## Integration example

```html
<!-- quiz app HTML, before your quiz JS -->
<script src="https://ahmad9077.github.io/quizzes-hub/access-guard.js"
        data-quiz-id="world-flags"></script>
<script src="https://ahmad9077.github.io/quizzes-hub/adaptive-client.js?v=1"></script>
```

```js
// quiz-app.js

const ALL_QUESTIONS = [
  {
    key:        "flag_brazil",
    image:      "flags/brazil.svg",
    choices:    ["Brazil", "Argentina", "Colombia", "Venezuela"],
    answer:     "Brazil"
  },
  {
    key:        "flag_micronesia",
    image:      "flags/micronesia.svg",
    choices:    ["Micronesia", "Palau", "Marshall Islands", "Nauru"],
    answer:     "Micronesia"
  },
  // ...
];

async function startQuiz() {
  // Wait for both guards to resolve
  const [access, adaptive] = await Promise.all([
    window.QuizzesHubAccessReady,
    window.QuizzesHubAdaptiveReady
  ]);

  // adaptive = { question_keys: ["flag_brazil", ...], attempts_today: 2 }
  // Level, weak topics, and difficulty labels are not returned to the child app.

  const questions = window.QuizzesHubAdaptive.selectQuestions(ALL_QUESTIONS, 10);
  runQuiz(questions);
}

async function finishQuiz(answers) {
  // answers: [{ question: ALL_QUESTIONS[i], correct: true/false }, ...]
  const result = await window.QuizzesHubAdaptive.recordAttempt(answers);
  // result: { ok: true, attempts_today: 3, attempts_until_adaptation: 2 }

  // Show only score, not level or attempts_until_adaptation
  showScore(answers.filter(a => a.correct).length, answers.length);
}
```

When a quiz app adopts `adaptive-client.js`, stop calling
`window.QuizzesHubProgress.record(...)` for that completed session. The adaptive
RPC records the attempt and keeps the admin activity feed populated, so calling
both clients would duplicate the same completion.

---

## Syncing to question_difficulty_profiles (admin task, done once)

After tagging questions, run this in the Supabase SQL editor to register them
so the server-side selection RPC (`get_quiz_question_keys`) can work:

```sql
-- Example for world-flags quiz
insert into public.question_difficulty_profiles (quiz_id, question_key, difficulty, topic_tags)
values
  ('world-flags', 'flag_brazil',      25, array['south_america', 'large_country']),
  ('world-flags', 'flag_micronesia',  82, array['oceania', 'island_nation', 'pacific'])
  -- ... one row per question
on conflict (quiz_id, question_key) do update set
  difficulty  = excluded.difficulty,
  topic_tags  = excluded.topic_tags,
  updated_at  = now();
```

Once this table is fully populated, `get_quiz_question_keys` can choose the
right questions without returning level, weak topics, or difficulty labels to
the browser.

---

## What NOT to implement until question banks are labelled

1. **Trusting adaptive selection as final** — `get_quiz_question_keys` needs
   `question_difficulty_profiles` to have complete, validated data for every quiz.
   Until then `selectQuestions()` falls back to random selection.

2. **Cross-quiz topic analytics** — weak topics are per-quiz only today.
   Cross-quiz aggregation (e.g. "user is weak at geography across all quizzes")
   requires topic namespaces to be consistent across quiz apps first.

3. **Spaced repetition (FSRS/SM-2)** — the current EMA engine is intentionally
   simple. Do not add per-card scheduling until you have a proper question bank
   with enough items per topic to make scheduling meaningful.

4. **Peer normalisation / percentile display** — requires a minimum user base.

5. **Parent-visible progress reports** — separate feature, different UI surface,
   different data requirements; plan separately.

6. **Automatic difficulty re-calibration** — re-scoring `question_difficulty_profiles`
   from empirical answer data is possible once you have enough records, but do
   not automate it; admin should review and approve changes.
