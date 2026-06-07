// adaptive-client.js — include in every quiz app AFTER access-guard.js
//
// Usage in quiz app HTML:
//   <script src="https://ahmad9077.github.io/quizzes-hub/access-guard.js"
//           data-quiz-id="world-flags"></script>
//   <script src="https://ahmad9077.github.io/quizzes-hub/adaptive-client.js?v=1"></script>
//
// Then in quiz app JS:
//   const access  = await window.QuizzesHubAccessReady;
//   const plan = await window.QuizzesHubAdaptiveReady;  // { question_keys, attempts_today }
//   const chosen  = window.QuizzesHubAdaptive.selectQuestions(ALL_QUESTIONS, 10);
//   // ... run quiz ...
//   await window.QuizzesHubAdaptive.recordAttempt(answers);
//
// Each question object in your quiz app MUST include:
//   key:        string  — stable unique ID, never changes (e.g. "flag_brazil")
//   (plus whatever your quiz already uses: image, choices, answer, etc.)
//
// Difficulty and topic labels belong in Supabase question_difficulty_profiles,
// not in the public quiz JavaScript.

(async () => {
  const fallbackPlan = { question_keys: [], attempts_today: 0 };
  let _resolveReady;
  let _rejectReady;
  window.QuizzesHubAdaptiveReady = new Promise((resolve, reject) => {
    _resolveReady = resolve;
    _rejectReady = reject;
  });

  // Wait for access guard to confirm the user is signed in and assigned
  let access;
  try {
    access = await window.QuizzesHubAccessReady;
  } catch {
    // Access denied — guard already redirected; nothing to do here
    _rejectReady(new Error("Quiz access denied"));
    return;
  }
  if (!access?.ok) {
    _rejectReady(new Error("Quiz access denied"));
    return;
  }

  const client = window.QuizzesHubSupabaseClient;
  const quizId = access.quizId;

  // Fetch selected question keys from Supabase. The current difficulty level
  // and weak topics stay server-side/admin-only.
  let plan = null;
  try {
    const { data: keyData, error: keyError } = await client.rpc("get_quiz_question_keys", {
      p_quiz_id: quizId,
      p_count: 50
    });
    const { data: profileData } = await client.rpc("get_user_quiz_profile", {
      p_quiz_id: quizId
    });
    if (!keyError && keyData) {
      plan = {
        question_keys: Array.isArray(keyData.question_keys) ? keyData.question_keys : [],
        attempts_today: profileData?.attempts_today ?? 0
      };
    }
  } catch {
    // If the migration hasn't run yet, fall back gracefully to random selection.
  }

  // Default profile when adaptive tables aren't ready yet
  plan = plan ?? fallbackPlan;
  _resolveReady(plan);

  window.QuizzesHubAdaptive = {
    plan,

    // ─────────────────────────────────────────────────────────
    // selectQuestions(allQuestions, count)
    //
    // Picks `count` questions using server-selected question keys.
    // If question_difficulty_profiles is not populated yet, falls back
    // to random shuffle without revealing any level information.
    // ─────────────────────────────────────────────────────────
    selectQuestions(allQuestions, count = 10) {
      const selectedKeys = Array.isArray(plan.question_keys) ? plan.question_keys : [];
      if (selectedKeys.length === 0) {
        return shuffle(allQuestions).slice(0, count);
      }

      const byKey = new Map(allQuestions.map(q => [q.key, q]));
      const selected = selectedKeys.map(key => byKey.get(key)).filter(Boolean);
      if (selected.length >= count) return selected.slice(0, count);

      const used = new Set(selected.map(q => q.key));
      const fill = shuffle(allQuestions.filter(q => !used.has(q.key)));
      return [...selected, ...fill].slice(0, count);
    },

    // ─────────────────────────────────────────────────────────
    // recordAttempt(answers)
    //
    // Call once after every completed quiz session.
    //
    // `answers` must be an array with one entry per question:
    //   {
    //     question: { key, ...rest },  // key is the only required field
    //     correct:  boolean
    //   }
    //
    // Returns { ok, attempts_today, attempts_until_adaptation }
    // ─────────────────────────────────────────────────────────
    async recordAttempt(answers) {
      if (!Array.isArray(answers) || answers.length === 0) {
        return { ok: false, reason: "no answers provided" };
      }

      const correct = answers.filter(a => a.correct).length;

      const qResults = answers.map(a => ({
        key: a.question?.key ?? null,
        correct: Boolean(a.correct)
      }));

      try {
        const { data, error } = await client.rpc("record_quiz_attempt", {
          p_quiz_id:          quizId,
          p_total_questions:  answers.length,
          p_correct_answers:  correct,
          p_question_results: qResults,
          p_avg_difficulty:   null
        });

        if (error) return { ok: false, reason: error.message };

        // Refresh non-sensitive attempt count.
        client.rpc("get_user_quiz_profile", { p_quiz_id: quizId })
          .then(({ data: fresh }) => {
            if (fresh) {
              plan = { ...plan, attempts_today: fresh.attempts_today ?? plan.attempts_today };
              window.QuizzesHubAdaptive.plan = plan;
            }
          });

        return { ok: true, ...data };
      } catch (err) {
        return { ok: false, reason: err.message };
      }
    }
  };

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
})();
