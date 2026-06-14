// challenge-client.js — optional helper for quiz apps that support Challenge Mode.
//
// It is intentionally separate from progress-client.js and adaptive-client.js.
// It never writes quiz_progress and never calls adaptive RPCs.

(async () => {
  const HUB_URL = "https://ahmad9077.github.io/quizzes-hub/";
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("challenge_session") || window.QUIZZES_HUB_CHALLENGE_SESSION_ID || "";
  const listeners = new Set();

  let state = null;
  let channel = null;
  let client = null;
  let currentUserId = null;
  let submitting = false;

  window.QuizzesHubChallengeReady = init();

  window.QuizzesHubChallenge = {
    get active() {
      return Boolean(sessionId);
    },
    get state() {
      return state;
    },
    get currentUserId() {
      return currentUserId;
    },
    onChange(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      if (state) listener(state);
      return () => listeners.delete(listener);
    },
    canAnswer() {
      return Boolean(
        state?.status === "active" &&
        state.current_answering_user_id &&
        state.current_answering_user_id === currentUserId
      );
    },
    getCurrentQuestion(allQuestions) {
      if (!Array.isArray(allQuestions) || !state?.current_question_key) return null;
      return allQuestions.find((question) => question.key === state.current_question_key) || null;
    },
    async refresh() {
      await ensureReady();
      return refreshState();
    },
    async submitAnswer({ answerText = "", isCorrect }) {
      await ensureReady();

      if (!sessionId) {
        return { ok: false, reason: "No challenge session." };
      }

      if (!window.QuizzesHubChallenge.canAnswer()) {
        return { ok: false, reason: "It is not this player's turn." };
      }

      if (submitting) {
        return { ok: false, reason: "Answer is already being submitted." };
      }

      submitting = true;
      try {
        const { data, error } = await client.rpc("submit_challenge_answer", {
          p_session_id: sessionId,
          p_answer_text: String(answerText || ""),
          p_is_correct: Boolean(isCorrect)
        });

        if (error) {
          return { ok: false, reason: error.message };
        }

        setState(data);
        return { ok: true, state };
      } finally {
        submitting = false;
      }
    },
    async leave() {
      await ensureReady();

      if (!sessionId) return { ok: false, reason: "No challenge session." };

      const { data, error } = await client.rpc("abandon_challenge_session", {
        p_session_id: sessionId
      });

      if (error) return { ok: false, reason: error.message };
      setState(data);
      return { ok: true, state };
    },
    openHub() {
      window.location.href = HUB_URL;
    }
  };

  async function init() {
    if (!sessionId) return null;

    window.QUIZZES_HUB_CHALLENGE_SESSION_ID = sessionId;

    try {
      if (window.QuizzesHubAccessReady) {
        await window.QuizzesHubAccessReady;
      }

      const config = await loadConfig();
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Quizzes Hub is not configured.");
      }

      if (!window.supabase) {
        await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      }

      client = window.QuizzesHubSupabaseClient || window.supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey
      );
      window.QuizzesHubSupabaseClient = client;

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData?.session?.user?.id) {
        throw new Error("Sign in is required.");
      }

      currentUserId = sessionData.session.user.id;
      await refreshState();
      subscribe();
      document.documentElement.dataset.challengeMode = "active";
      return state;
    } catch (error) {
      console.error("Quizzes Hub challenge setup failed.", error);
      document.documentElement.dataset.challengeMode = "error";
      throw error;
    }
  }

  async function refreshState() {
    if (!client) {
      throw new Error("Challenge client is not ready.");
    }

    const { data, error } = await client.rpc("get_challenge_state", {
      p_session_id: sessionId
    });

    if (error) throw error;
    setState(data);
    return state;
  }

  function subscribe() {
    if (!client || !sessionId || channel) return;

    channel = client
      .channel(`challenge:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_sessions", filter: `id=eq.${sessionId}` },
        refreshState
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_players", filter: `session_id=eq.${sessionId}` },
        refreshState
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_turns", filter: `session_id=eq.${sessionId}` },
        refreshState
      )
      .subscribe();
  }

  function setState(nextState) {
    state = nextState;
    listeners.forEach((listener) => listener(state));
  }

  async function ensureReady() {
    await window.QuizzesHubChallengeReady;
    if (!client) {
      throw new Error("Challenge client is not ready.");
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
})();
