# Adaptive Engine — How It Works

Current behaviour as of migration `007_adaptive_engine_tuning.sql`. For
question tagging conventions see `adaptive-question-tagging.md`.

## Data flow

1. Quiz apps call `record_quiz_attempt` after every completed round. Each
   attempt is appended to `quiz_daily_aggregates` (one row per user, quiz,
   and day) and logged in `quiz_progress` for the admin activity feed.
2. A pg_cron job (`quizzes-hub-adaptive-daily-5am`, `0 2 * * *` UTC =
   5 AM Asia/Kuwait) calls `run_due_adaptive_evaluations(yesterday)`.
3. The runner evaluates every user+quiz pair whose **unevaluated attempts
   up to that date total 3 or more** — a trailing window, not a single
   calendar day. A child who plays once a day adapts every ~3 days; a
   missed cron run is caught up automatically the next morning because
   unevaluated days stay eligible.
4. `get_quiz_question_keys` serves each round from the updated level.

## Evaluation (`evaluate_adaptive_level`)

For the pooled window of unevaluated days:

- **Accuracy** = pooled `correct_qs / total_qs`. When per-question results
  are provided, both counts are derived server-side from them.
- **EMA**: `ema = 0.3 × accuracy + 0.7 × previous_ema`.
- **Level delta** from EMA bands (targets a ~65–75% comfort zone):

  | EMA          | Delta |
  |--------------|-------|
  | ≥ 0.95       | +10   |
  | ≥ 0.88       | +6    |
  | ≥ 0.80       | +3    |
  | ≥ 0.72       | +1    |
  | 0.62–0.72    | 0 (hold) |
  | ≥ 0.52       | −1.5  |
  | ≥ 0.40       | −3    |
  | ≥ 0.25       | −6    |
  | < 0.25       | −10   |

- **Difficulty factor**: the delta is scaled by
  `clamp(avg_difficulty / current_level, 0.5, 1.25)` for upward moves and
  by its mirror (`2 − factor`) for downward moves. Succeeding on
  harder-than-level questions counts more; failing easier-than-level
  questions counts more.
- **Confidence damping**: delta × `(0.4 + 0.6 × confidence)`. Confidence
  grows +0.1 per evaluation (cap 1.0) and **decays** 0.1 per full week of
  inactivity beyond the first (floor 0.2), so a stale estimate is not
  trusted at full strength. Final delta is clamped to ±12.
- **Level** stays within 1–100. Every evaluation is written to
  `adaptive_adjustment_log` with the full window details.

## Topic mastery

`user_quiz_adaptive_state.topic_mastery` keeps a persistent per-topic EMA:
`{ "topic": { "ema": 0.62, "samples": 14 } }`, updated with
`ema = 0.4 × window_accuracy + 0.6 × previous`. A topic is flagged **weak**
when its EMA < 0.55 and **strong** when ≥ 0.85, but only after at least
4 answered questions — one wrong answer on a new topic no longer flags it,
and topics keep their status across days they were not played.

## Question selection (`get_quiz_question_keys`)

Ordering, best first:

1. **Freshness** — keys answered in the user's last 3 recorded attempts
   (tracked server-side via `quiz_progress`, so it works across devices)
   sort behind everything else.
2. **Difficulty window** — `[level − 15, level + 10]` (slightly easier
   bias) outranks topic priority, so weak topics are practised at an
   appropriate difficulty rather than at any difficulty.
3. **Weak-topic interleave** — weak-topic questions appear at roughly
   30% of any prefix of the list instead of being front-loaded, so a
   round is never all remedial material.
4. Closest-to-level first, randomised among ties.

The client (`adaptive-client.js`) still keeps a per-device localStorage
rotation as a secondary safeguard; the server-side recency handling above
is the primary one.

## Tuning constants (all in migration 007)

| Constant | Value | Where |
|----------|-------|-------|
| Evaluation threshold (pooled attempts) | 3 | `evaluate_adaptive_level` |
| EMA alpha | 0.3 | `evaluate_adaptive_level` |
| Topic EMA alpha | 0.4 | `evaluate_adaptive_level` |
| Confidence step / floor after decay | +0.1 / 0.2 | `evaluate_adaptive_level` |
| Difficulty factor clamp | 0.5–1.25 | `evaluate_adaptive_level` |
| Delta clamp | ±12 | `evaluate_adaptive_level` |
| Weak / strong topic thresholds | < 0.55 / ≥ 0.85 (min 4 samples) | `evaluate_adaptive_level` |
| Selection window | level −15 … +10 | `get_quiz_question_keys` |
| Weak-topic share per round | ~30% | `get_quiz_question_keys` |
| Recency horizon | last 3 attempts | `get_quiz_question_keys` |

## Deliberately not implemented

- **Automatic difficulty re-calibration** of
  `question_difficulty_profiles` — per the tagging guide, empirical
  re-scoring should be reviewed and approved by the admin, not automated.
- **Per-question Elo/IRT updates** — a possible future replacement for the
  band table; the schema (per-question profiles plus per-question result
  logging in `quiz_progress`) already supports it.
