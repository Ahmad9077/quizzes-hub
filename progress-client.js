(async () => {
  if (!window.QUIZZES_HUB_CONFIG) {
    await loadScript("https://ahmad9077.github.io/quizzes-hub/config.js?v=4");
  }

  if (!window.supabase) {
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
  }

  const config = window.QUIZZES_HUB_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR_") &&
    !config.supabaseAnonKey.includes("YOUR_")
  );
  const client = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;

  window.QuizzesHubProgress = {
    async record(result) {
      if (!client) return { ok: false, reason: "not-configured" };
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return { ok: false, reason: "not-signed-in" };

      const payload = {
        user_id: user.id,
        quiz_id: result.quizId,
        score: result.score,
        total: result.total,
        level: result.level || "Practice",
        details: result.details || {}
      };

      const { error } = await client.from("quiz_progress").insert(payload);
      return error ? { ok: false, reason: error.message } : { ok: true };
    }
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }
})();
