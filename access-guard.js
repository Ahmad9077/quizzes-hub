(function () {
  const HUB_URL = "https://ahmad9077.github.io/quizzes-hub/";
  const currentScript = document.currentScript;
  const autoQuizId = currentScript?.dataset.quizId || window.QUIZZES_HUB_QUIZ_ID || "";
  const challengeSessionId = new URLSearchParams(window.location.search).get("challenge_session") || "";

  if (challengeSessionId) {
    window.QUIZZES_HUB_CHALLENGE_SESSION_ID = challengeSessionId;
  }

  window.QuizzesHubAccessGuard = {
    require: requireQuizAccess
  };

  if (autoQuizId) {
    window.QuizzesHubAccessReady = requireQuizAccess({ quizId: autoQuizId });
  } else {
    console.warn("Quizzes Hub access guard is missing data-quiz-id.");
    window.QuizzesHubAccessReady = denyAccess("missing-quiz");
  }

  async function requireQuizAccess(options) {
    const quizId = String(options?.quizId || "").trim();

    if (!quizId) {
      console.warn("Quizzes Hub access guard was called without a quiz ID.");
      return denyAccess("missing-quiz");
    }

    try {
      const config = await loadConfig();
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        return denyAccess("not-configured");
      }

      if (!window.supabase) {
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      }

      const client = window.QuizzesHubSupabaseClient || window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey
      );
      window.QuizzesHubSupabaseClient = client;

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      const session = sessionData?.session;
      if (sessionError || !session?.user?.id) {
        return denyAccess("signin");
      }

      const { data, error } = await client
        .from("quiz_assignments")
        .select("quiz_id, difficulty")
        .eq("user_id", session.user.id)
        .eq("quiz_id", quizId)
        .maybeSingle();

      if (error || !data) {
        return denyAccess("unauthorized");
      }

      const access = {
        ok: true,
        quizId,
        difficulty: normalizeDifficulty(data.difficulty)
      };
      window.QuizzesHubLastQuizAccess = access;
      document.documentElement.dataset.quizAccess = "granted";
      return access;
    } catch (error) {
      console.error("Quizzes Hub access check failed.", error);
      return denyAccess("error");
    }
  }

  async function loadConfig() {
    if (!window.QUIZZES_HUB_CONFIG) {
      await loadScript(`${HUB_URL}config.js?v=4`);
    }

    return window.QUIZZES_HUB_CONFIG || {};
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  function denyAccess(reason) {
    document.documentElement.dataset.quizAccess = "denied";
    const redirectUrl = new URL(HUB_URL);
    redirectUrl.searchParams.set("access", reason);
    redirectUrl.searchParams.set("from", window.location.href);
    window.location.replace(redirectUrl.toString());
    return Promise.reject(new Error(`Quiz access denied: ${reason}`));
  }

  function normalizeDifficulty(value) {
    return ["easy", "medium", "hard"].includes(value) ? value : "medium";
  }
})();
