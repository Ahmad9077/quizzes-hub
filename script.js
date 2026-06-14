const app = document.querySelector("#app");

const quizCatalog = [
  {
    id: "world-flags",
    title: "World Flags Quiz",
    icon: "🌍",
    color: "#e5f8ff",
    url: "https://ahmad9077.github.io/world-flags-quiz/"
  },
  {
    id: "country-map",
    title: "Country Map Quiz",
    icon: "🗺️",
    color: "#eafff9",
    url: "https://ahmad9077.github.io/country-map-quiz/"
  },
  {
    id: "spelling",
    title: "Spelling Quiz",
    icon: "🔤",
    color: "#fff2bf",
    url: "https://ahmad9077.github.io/spelling-quiz/"
  },
  {
    id: "picture-reading",
    title: "Picture Reading Quiz",
    icon: "📖",
    color: "#ffece6",
    url: "https://ahmad9077.github.io/little-words-picture-quiz/"
  },
  {
    id: "english-word-choice",
    title: "English Word Choice Quiz",
    icon: "🔠",
    color: "#e7f5ef",
    url: "https://ahmad9077.github.io/english-word-choice-quiz/"
  }
];

const config = window.QUIZZES_HUB_CONFIG || {};
const isConfigured = Boolean(
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_") &&
  !config.supabaseAnonKey.includes("YOUR_")
);
const supabaseClient = isConfigured
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

let currentSession = null;
let currentProfile = null;
let currentChallengeState = null;
let currentChallengeChannel = null;
let dashboardAssignments = [];

// Dates are always shown as DD/MM/YYYY (en-GB), never US format.
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function formatDate(value) {
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value) {
  const date = new Date(value);
  return `${dateFormatter.format(date)} ${timeFormatter.format(date)}`;
}

init();

async function init() {
  if (!isConfigured) {
    renderTemplate("setupTemplate");
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentSession = data.session;

  if (!currentSession) {
    renderLogin();
    return;
  }

  await loadCurrentProfile();
  await renderDashboard();
}

function renderTemplate(templateId) {
  const template = document.querySelector(`#${templateId}`);
  app.replaceChildren(template.content.firstElementChild.cloneNode(true));
}

function setMessage(node, message, isError = false) {
  node.textContent = message;
  node.classList.toggle("is-error", isError);
}

function renderLogin() {
  renderTemplate("loginTemplate");
  const form = document.querySelector("#loginForm");
  const message = document.querySelector("#loginMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(message, "Signing in…");

    const formData = new FormData(form);
    const username = String(formData.get("username")).trim().toLowerCase();
    const password = String(formData.get("password"));

    try {
      const { data: loginData, error: resolveError } = await supabaseClient.rpc("resolve_login", {
        requested_username: username
      });

      const loginEmail = Array.isArray(loginData) ? loginData[0]?.login_email : loginData?.login_email;

      if (resolveError || !loginEmail) {
        throw new Error("Username not found.");
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (error) {
        throw error;
      }

      currentSession = data.session;
      await loadCurrentProfile();
      await renderDashboard();
    } catch (error) {
      setMessage(message, error.message || "Could not sign in.", true);
    }
  });
}

async function loadCurrentProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, role, avatar, active")
    .eq("id", currentSession.user.id)
    .single();

  if (error || !data?.active) {
    await supabaseClient.auth.signOut();
    currentSession = null;
    currentProfile = null;
    renderLogin();
    return;
  }

  currentProfile = data;
}

async function renderDashboard() {
  renderTemplate("dashboardTemplate");
  document.querySelector("#dashboardTitle").textContent = `Hi, ${currentProfile.display_name}`;

  const adminButton = document.querySelector("#adminViewButton");
  adminButton.hidden = currentProfile.role !== "admin";
  adminButton.addEventListener("click", renderAdmin);
  document.querySelector("#logoutButton").addEventListener("click", logout);

  dashboardAssignments = await fetchAssignments(currentProfile.id);
  setupDashboardTabs();
  renderAssignedQuizzes(dashboardAssignments);
  renderChallengeMode(dashboardAssignments);
}

async function fetchAssignments(userId) {
  const { data, error } = await supabaseClient
    .from("quiz_assignments")
    .select("quiz_id")
    .eq("user_id", userId)
    .order("quiz_id");

  if (error) {
    return [];
  }

  return data || [];
}

function renderAssignedQuizzes(assignments) {
  const grid = document.querySelector("#assignedQuizGrid");
  const assignmentMap = createAssignmentMap(assignments);
  const allowed = quizCatalog.filter((quiz) => assignmentMap.has(quiz.id));

  if (!allowed.length) {
    grid.replaceChildren(createEmptyState("No quizzes assigned."));
    return;
  }

  allowed.forEach((quiz) => grid.append(createQuizTile(quiz)));
}

function setupDashboardTabs() {
  const quizzesButton = document.querySelector("#quizzesTabButton");
  const challengeButton = document.querySelector("#challengeTabButton");
  quizzesButton.addEventListener("click", () => activateDashboardTab("quizzes"));
  challengeButton.addEventListener("click", () => activateDashboardTab("challenge"));
}

function activateDashboardTab(tabName) {
  const isChallenge = tabName === "challenge";
  document.querySelector("#quizzesPanel").hidden = isChallenge;
  document.querySelector("#challengePanel").hidden = !isChallenge;
  document.querySelector("#quizzesTabButton").classList.toggle("active-tab", !isChallenge);
  document.querySelector("#challengeTabButton").classList.toggle("active-tab", isChallenge);
  if (isChallenge) loadOpenChallenges();
}

function getAllowedQuizzes(assignments) {
  const assignmentMap = createAssignmentMap(assignments);
  return quizCatalog.filter((quiz) => assignmentMap.has(quiz.id));
}

function createQuizTile(quiz) {
  const tile = document.querySelector("#quizTileTemplate").content.firstElementChild.cloneNode(true);
  tile.href = quiz.url;
  tile.style.setProperty("--tile-color", quiz.color);
  tile.setAttribute("aria-label", `Start ${quiz.title}`);
  tile.querySelector(".quiz-icon").textContent = quiz.icon;
  tile.querySelector(".quiz-name").textContent = quiz.title;
  return tile;
}

function renderChallengeMode(assignments) {
  const allowed = getAllowedQuizzes(assignments);
  const select = document.querySelector("#challengeQuizSelect");
  const createMessage = document.querySelector("#challengeCreateMessage");
  const joinMessage = document.querySelector("#challengeJoinMessage");
  const createForm = document.querySelector("#createChallengeForm");
  const joinForm = document.querySelector("#joinChallengeForm");
  const refreshButton = document.querySelector("#refreshChallengesButton");

  select.replaceChildren();

  if (!allowed.length) {
    select.disabled = true;
    createForm.querySelector("button").disabled = true;
    select.append(new Option("No quizzes assigned", ""));
  } else {
    allowed.forEach((quiz) => {
      select.append(new Option(`${quiz.icon} ${quiz.title}`, quiz.id));
    });
  }

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(createMessage, "Creating…");

    const formData = new FormData(createForm);
    const quizId = String(formData.get("quizId") || "");

    try {
      const { data, error } = await supabaseClient.rpc("create_challenge_session", {
        p_quiz_id: quizId
      });

      if (error) throw error;

      setMessage(createMessage, "Session ready.");
      setChallengeState(data);
      await loadOpenChallenges();
    } catch (error) {
      setMessage(createMessage, error.message || "Could not create session.", true);
    }
  });

  joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(joinMessage, "Joining…");

    const formData = new FormData(joinForm);
    const inviteCode = String(formData.get("inviteCode") || "").trim().toUpperCase();

    if (!inviteCode) {
      setMessage(joinMessage, "Code is required.", true);
      return;
    }

    try {
      const state = await joinChallengeSession(null, inviteCode);
      joinForm.reset();
      setMessage(joinMessage, "Joined.");
      setChallengeState(state);
      await loadOpenChallenges();
    } catch (error) {
      setMessage(joinMessage, error.message || "Could not join session.", true);
    }
  });

  refreshButton.addEventListener("click", loadOpenChallenges);
  renderChallengeState();
  loadOpenChallenges();
}

async function loadOpenChallenges() {
  const list = document.querySelector("#openChallengesList");
  if (!list) return;

  list.replaceChildren(createEmptyState("Loading…"));

  await supabaseClient.rpc("purge_expired_challenges").catch(() => {});

  const { data, error } = await supabaseClient.rpc("list_open_challenge_sessions");
  if (error) {
    list.replaceChildren(createEmptyState("Could not load sessions."));
    return;
  }

  if (!data?.length) {
    list.replaceChildren(createEmptyState("No open sessions."));
    return;
  }

  list.replaceChildren();
  data.forEach((session) => list.append(createOpenChallengeRow(session)));
}

function createOpenChallengeRow(session) {
  const row = document.createElement("article");
  row.className = "challenge-row";

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${session.quiz_icon || "🎯"} ${session.quiz_title || session.quiz_id}`;
  const meta = document.createElement("div");
  meta.className = "progress-meta";
  meta.textContent = `${session.host_display_name} · code ${session.invite_code}`;
  content.append(title, meta);

  const button = document.createElement("button");
  button.className = "mini-action";
  button.type = "button";
  button.textContent = "Join";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Joining…";
    try {
      const state = await joinChallengeSession(session.session_id, null);
      setChallengeState(state);
      await loadOpenChallenges();
    } catch (error) {
      window.alert(error.message || "Could not join session.");
      button.disabled = false;
      button.textContent = "Join";
    }
  });

  row.append(content, button);
  return row;
}

async function joinChallengeSession(sessionId, inviteCode) {
  const { data, error } = await supabaseClient.rpc("join_challenge_session", {
    p_session_id: sessionId,
    p_invite_code: inviteCode
  });

  if (error) throw error;
  return data;
}

function setChallengeState(state) {
  currentChallengeState = state;
  renderChallengeState();
  subscribeToChallenge(state?.id);
}

async function refreshChallengeState() {
  if (!currentChallengeState?.id) return;

  const { data, error } = await supabaseClient.rpc("get_challenge_state", {
    p_session_id: currentChallengeState.id
  });

  if (!error && data) {
    currentChallengeState = data;
    renderChallengeState();
  }
}

function subscribeToChallenge(sessionId) {
  if (currentChallengeChannel) {
    supabaseClient.removeChannel(currentChallengeChannel);
    currentChallengeChannel = null;
  }

  if (!sessionId) return;

  currentChallengeChannel = supabaseClient
    .channel(`challenge:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_sessions", filter: `id=eq.${sessionId}` },
      refreshChallengeState
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_players", filter: `session_id=eq.${sessionId}` },
      refreshChallengeState
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenge_turns", filter: `session_id=eq.${sessionId}` },
      refreshChallengeState
    )
    .subscribe();
}

function renderChallengeState() {
  const card = document.querySelector("#activeChallengeCard");
  const container = document.querySelector("#activeChallenge");
  if (!card || !container) return;

  if (!currentChallengeState) {
    card.hidden = true;
    container.replaceChildren();
    return;
  }

  card.hidden = false;
  container.replaceChildren();

  const header = document.createElement("div");
  header.className = "challenge-session-header";

  const titleWrap = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = `${currentChallengeState.quiz?.icon || "🎯"} ${currentChallengeState.quiz?.title || currentChallengeState.quiz_id}`;
  const meta = document.createElement("p");
  meta.className = "progress-meta";
  meta.textContent = `Code ${currentChallengeState.invite_code} · ${formatChallengeStatus(currentChallengeState.status)}`;
  titleWrap.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "challenge-actions";
  actions.append(createCopyCodeButton(currentChallengeState.invite_code));

  if (currentChallengeState.status === "waiting" && currentChallengeState.host_id === currentProfile.id) {
    const startButton = document.createElement("button");
    startButton.className = "primary-action";
    startButton.type = "button";
    startButton.textContent = "Start";
    startButton.disabled = (currentChallengeState.players || []).length !== 2;
    startButton.addEventListener("click", startCurrentChallenge);
    actions.append(startButton);
  }

  if (["waiting", "active"].includes(currentChallengeState.status)) {
    const cancelButton = document.createElement("button");
    cancelButton.className = "mini-action";
    cancelButton.type = "button";
    cancelButton.textContent = "Leave";
    cancelButton.addEventListener("click", abandonCurrentChallenge);
    actions.append(cancelButton);
  }

  header.append(titleWrap, actions);
  container.append(header);

  const players = document.createElement("div");
  players.className = "challenge-players";
  (currentChallengeState.players || []).forEach((player) => {
    players.append(createChallengePlayerCard(player));
  });

  if ((currentChallengeState.players || []).length < 2) {
    players.append(createWaitingPlayerCard());
  }

  container.append(players);
  container.append(createChallengeStatusPanel(currentChallengeState));
}

function createChallengePlayerCard(player) {
  const card = document.createElement("article");
  card.className = "challenge-player";
  if (player.user_id === currentChallengeState.current_answering_user_id) {
    card.classList.add("is-current-turn");
  }

  const name = document.createElement("strong");
  name.textContent = `${player.avatar || "⭐"} ${player.display_name}`;
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  meta.textContent = `${player.is_host ? "Host" : "Player"} · ${player.wrong_count}/3 wrong`;
  card.append(name, meta);
  return card;
}

function createWaitingPlayerCard() {
  const card = document.createElement("article");
  card.className = "challenge-player is-empty";
  const name = document.createElement("strong");
  name.textContent = "Waiting";
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  meta.textContent = "Share the code";
  card.append(name, meta);
  return card;
}

function createChallengeStatusPanel(state) {
  const panel = document.createElement("div");
  panel.className = "challenge-status-panel";

  if (state.status === "waiting") {
    panel.append(createEmptyState("Waiting for another player."));
    return panel;
  }

  if (state.status === "active") {
    const currentPlayer = (state.players || []).find((player) => player.user_id === state.current_answering_user_id);
    const message = document.createElement("p");
    message.className = "challenge-turn-message";
    message.textContent = state.current_answering_user_id === currentProfile.id
      ? "Your turn"
      : `${currentPlayer?.display_name || "Other player"}'s turn`;
    panel.append(message, createChallengeLaunchLink(state));
    return panel;
  }

  if (state.status === "finished") {
    const winner = (state.players || []).find((player) => player.user_id === state.winner_id);
    const message = document.createElement("p");
    message.className = "challenge-turn-message";
    message.textContent = winner ? `${winner.display_name} wins` : "Challenge finished";
    panel.append(message);
    return panel;
  }

  panel.append(createEmptyState("Challenge ended."));
  return panel;
}

function createChallengeLaunchLink(state) {
  const link = document.createElement("a");
  link.className = "primary-action";
  link.href = buildChallengeQuizUrl(state);
  link.textContent = "Open quiz";
  return link;
}

function buildChallengeQuizUrl(state) {
  const url = new URL(state.quiz?.url || quizCatalog.find((quiz) => quiz.id === state.quiz_id)?.url || window.location.href);
  url.searchParams.set("challenge_session", state.id);
  return url.toString();
}

function createCopyCodeButton(code) {
  const button = document.createElement("button");
  button.className = "mini-action";
  button.type = "button";
  button.textContent = "Copy code";
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy code";
      }, 1400);
    } catch {
      window.prompt("Challenge code", code);
    }
  });
  return button;
}

async function startCurrentChallenge() {
  if (!currentChallengeState?.id) return;

  const { data, error } = await supabaseClient.rpc("start_challenge_session", {
    p_session_id: currentChallengeState.id
  });

  if (error) {
    window.alert(error.message || "Could not start challenge.");
    return;
  }

  setChallengeState(data);
}

async function abandonCurrentChallenge() {
  if (!currentChallengeState?.id) return;

  const { data, error } = await supabaseClient.rpc("abandon_challenge_session", {
    p_session_id: currentChallengeState.id
  });

  if (error) {
    window.alert(error.message || "Could not leave challenge.");
    return;
  }

  setChallengeState(data);
  await loadOpenChallenges();
}

function formatChallengeStatus(status) {
  if (status === "waiting") return "Waiting";
  if (status === "active") return "Live";
  if (status === "finished") return "Finished";
  return "Ended";
}

async function renderAdmin() {
  renderTemplate("adminTemplate");
  document.querySelector("#backToDashboardButton").addEventListener("click", renderDashboard);
  document.querySelector("#adminLogoutButton").addEventListener("click", logout);
  renderAssignmentCheckboxes(document.querySelector("#newUserAssignments"), []);
  document.querySelector("#createUserForm").addEventListener("submit", createUser);
  await renderAdminUsers();
  await renderAdminActivity();
}

function renderAssignmentCheckboxes(container, assignments) {
  const legend = container.querySelector("legend") || document.createElement("legend");
  legend.textContent = "Quiz access";
  container.replaceChildren(legend);
  const assignmentMap = createAssignmentMap(assignments);

  quizCatalog.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = quiz.id;
    input.checked = assignmentMap.has(quiz.id);
    const text = document.createElement("span");
    text.textContent = `${quiz.icon} ${quiz.title}`;
    label.append(input, text);
    container.append(label);
  });
}

async function createUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#createUserMessage");
  const formData = new FormData(form);
  const quizConfigs = getAssignmentConfigs(document.querySelector("#newUserAssignments"));

  setMessage(message, "Creating…");

  try {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${currentSession.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "create",
        username: String(formData.get("username")).trim().toLowerCase(),
        displayName: String(formData.get("displayName")).trim(),
        password: String(formData.get("password")),
        role: String(formData.get("role")),
        quizConfigs
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not create user.");
    }

    form.reset();
    setMessage(message, "User created.");
    await renderAdminUsers();
  } catch (error) {
    setMessage(message, error.message, true);
  }
}

async function renderAdminUsers() {
  const list = document.querySelector("#adminUsersList");
  list.replaceChildren(createEmptyState("Loading…"));

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, role, avatar, active")
    .order("display_name");

  if (error) {
    list.replaceChildren(createEmptyState("Could not load users."));
    return;
  }

  list.replaceChildren();

  for (const user of users) {
    const assignments = await fetchAssignments(user.id);
    const row = document.createElement("article");
    row.className = "user-row";

    const content = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = `${user.avatar || "⭐"} ${user.display_name}`;
    const meta = document.createElement("div");
    meta.className = "progress-meta";
    meta.textContent = `@${user.username} · ${user.role}`;
    const fieldset = document.createElement("fieldset");
    const passwordReset = document.createElement("label");
    passwordReset.className = "password-reset";
    const passwordText = document.createElement("span");
    passwordText.textContent = "New password";
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.autocomplete = "new-password";
    passwordInput.placeholder = "New password";
    passwordReset.append(passwordText, passwordInput);
    const actions = document.createElement("div");
    actions.className = "assignment-actions";
    const saveButton = document.createElement("button");
    saveButton.className = "mini-action save-access";
    saveButton.type = "button";
    saveButton.textContent = "Save access";
    const passwordButton = document.createElement("button");
    passwordButton.className = "mini-action";
    passwordButton.type = "button";
    passwordButton.textContent = "Change password";
    const deleteButton = document.createElement("button");
    deleteButton.className = "mini-action danger-action";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.hidden = user.id === currentProfile.id;
    const adaptiveButton = document.createElement("button");
    adaptiveButton.className = "mini-action";
    adaptiveButton.type = "button";
    adaptiveButton.textContent = "Adaptive levels";
    const passwordMessage = document.createElement("p");
    passwordMessage.className = "form-message compact-message";
    actions.append(saveButton, passwordButton, deleteButton, adaptiveButton);
    content.append(name, meta, fieldset, passwordReset, actions, passwordMessage);

    const adaptivePanel = createAdaptivePanel(user.id, assignments);
    row.append(content, adaptivePanel);

    renderAssignmentCheckboxes(fieldset, assignments);
    saveButton.addEventListener("click", () => saveAssignments(user.id, fieldset, saveButton));
    passwordButton.addEventListener("click", () => updateUserPassword(user.id, passwordInput, passwordMessage));
    deleteButton.addEventListener("click", () => deleteUserAccount(user, passwordMessage));
    adaptiveButton.addEventListener("click", () => {
      adaptivePanel.hidden = !adaptivePanel.hidden;
      if (!adaptivePanel.hidden) loadAdaptiveAnalytics(user.id, adaptivePanel);
    });
    list.append(row);
  }
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

async function saveAssignments(userId, fieldset, button) {
  const quizConfigs = getAssignmentConfigs(fieldset);
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Saving…";

  const { error } = await supabaseClient.rpc("admin_set_assignments", {
    target_user_id: userId,
    quiz_configs: quizConfigs
  });

  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    window.alert(error.message || "Could not save quiz access.");
    return;
  }

  await renderAdminUsers();
}

function getAssignmentConfigs(container) {
  return [...container.querySelectorAll("input[type='checkbox']:checked")].map((input) => {
    return {
      quiz_id: input.value,
      difficulty: "medium"
    };
  });
}

function createAssignmentMap(assignments) {
  return new Map((assignments || []).map((assignment) => {
    if (typeof assignment === "string") {
      return [assignment, true];
    }

    return [assignment.quiz_id, true];
  }));
}

async function updateUserPassword(userId, input, message) {
  const password = input.value;
  setMessage(message, "Saving…");

  if (!password) {
    setMessage(message, "Password is required.", true);
    return;
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${currentSession.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "update-password",
        userId,
        password
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Could not change password.");
    }

    input.value = "";
    setMessage(message, "Password changed.");
  } catch (error) {
    setMessage(message, error.message || "Could not change password.", true);
  }
}

async function deleteUserAccount(user, message) {
  const confirmed = window.confirm(`Delete ${user.display_name}'s account and all stored progress?`);
  if (!confirmed) return;

  setMessage(message, "Deleting…");

  try {
    const { error } = await supabaseClient.rpc("admin_delete_user", {
      target_user_id: user.id
    });

    if (error) {
      throw error;
    }

    await renderAdminUsers();
    await renderAdminActivity();
  } catch (error) {
    setMessage(message, error.message || "Could not delete account.", true);
  }
}

async function renderAdminActivity() {
  const list = document.querySelector("#adminActivityList");
  list.replaceChildren(createEmptyState("Loading…"));

  const [profiles, quizzes, index] = await Promise.all([
    fetchProfilesForActivity(),
    fetchQuizzesForActivity(),
    fetchActivityIndex()
  ]);

  if (!profiles.length) {
    list.replaceChildren(createEmptyState("Could not load activity."));
    return;
  }

  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  const statsByUser = new Map();
  index.forEach((row) => {
    const stats = statsByUser.get(row.user_id) || { count: 0, last: row.completed_at };
    stats.count += 1;
    if (row.completed_at > stats.last) stats.last = row.completed_at;
    statsByUser.set(row.user_id, stats);
  });

  list.replaceChildren();
  profiles.forEach((profile) => {
    list.append(createUserActivityGroup(profile, statsByUser.get(profile.id), quizMap));
  });
}

async function fetchActivityIndex() {
  const { data, error } = await supabaseClient
    .from("quiz_progress")
    .select("user_id, completed_at")
    .order("completed_at", { ascending: false })
    .limit(1000);

  return error ? [] : data || [];
}

function createUserActivityGroup(profile, stats, quizMap) {
  const group = document.createElement("details");
  group.className = "user-activity";

  const summary = document.createElement("summary");
  const name = document.createElement("strong");
  name.textContent = profile.display_name;
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  meta.textContent = stats
    ? `${stats.count} ${stats.count === 1 ? "attempt" : "attempts"} · last ${formatDateTime(stats.last)}`
    : "No activity";
  summary.append(name, meta);

  const body = document.createElement("div");
  body.className = "activity-list user-activity-items";
  group.append(summary, body);

  if (!stats) {
    body.append(createEmptyState("No activity yet."));
    return group;
  }

  // Activities load on first expand only
  let loaded = false;
  group.addEventListener("toggle", async () => {
    if (!group.open || loaded) return;
    loaded = true;
    body.replaceChildren(createEmptyState("Loading…"));

    const { data, error } = await supabaseClient
      .from("quiz_progress")
      .select("quiz_id, score, total, level, details, completed_at")
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: false })
      .limit(200);

    if (error) {
      loaded = false;
      body.replaceChildren(createEmptyState("Could not load activity."));
      return;
    }

    body.replaceChildren();
    (data || []).forEach((item) => {
      body.append(createActivityItem(item, quizMap.get(item.quiz_id)));
    });
  });

  return group;
}

async function fetchProfilesForActivity() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name")
    .order("display_name");

  return error ? [] : data || [];
}

async function fetchQuizzesForActivity() {
  const { data, error } = await supabaseClient
    .from("quizzes")
    .select("id, title")
    .order("sort_order");

  return error ? [] : data || [];
}

function createActivityItem(item, quiz) {
  const row = document.createElement("article");
  row.className = "activity-item";

  const header = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = quiz?.title || item.quiz_id;
  const meta = document.createElement("div");
  meta.className = "progress-meta";
  meta.textContent = `${item.level || "Practice"} · ${formatDateTime(item.completed_at)}`;
  header.append(title, meta);

  const score = document.createElement("div");
  score.className = "progress-score";
  score.textContent = `${item.score}/${item.total}`;

  row.append(header, score);

  const summaryText = summarizeProgressDetails(item.details);
  if (summaryText) {
    const summary = document.createElement("p");
    summary.className = "activity-summary";
    summary.textContent = summaryText;
    row.append(summary);
  }

  if (item.details && Object.keys(item.details).length) {
    const details = document.createElement("details");
    details.className = "activity-details";
    const detailsSummary = document.createElement("summary");
    detailsSummary.textContent = "Answer details";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(item.details, null, 2);
    details.append(detailsSummary, pre);
    row.append(details);
  }

  return row;
}

function summarizeProgressDetails(details) {
  if (!details || typeof details !== "object") {
    return "";
  }

  if (Array.isArray(details.answers)) {
    const correct = details.answers.filter((answer) => answer.correct).length;
    const wrong = details.answers.length - correct;
    return `${correct} correct · ${wrong} wrong`;
  }

  if (Number.isFinite(details.wrongCount)) {
    return `${details.wrongCount} wrong`;
  }

  return "";
}

async function logout() {
  if (currentChallengeChannel) {
    supabaseClient.removeChannel(currentChallengeChannel);
    currentChallengeChannel = null;
  }
  currentChallengeState = null;
  dashboardAssignments = [];
  await supabaseClient.auth.signOut();
  currentSession = null;
  currentProfile = null;
  renderLogin();
}

// ─────────────────────────────────────────────────────────────────
// ADAPTIVE LEVEL ADMIN UI
// Only rendered inside the admin panel. Never shown to child users.
// ─────────────────────────────────────────────────────────────────

function createAdaptivePanel(userId, assignments) {
  const panel = document.createElement("div");
  panel.className = "adaptive-panel";
  panel.hidden = true;
  panel.dataset.userId = userId;

  const heading = document.createElement("h4");
  heading.textContent = "Adaptive level";
  panel.append(heading);

  if (!assignments.length) {
    panel.append(createEmptyState("No quizzes assigned."));
    return panel;
  }

  const tabBar = document.createElement("div");
  tabBar.className = "adaptive-tab-bar";

  const content = document.createElement("div");
  content.className = "adaptive-tab-content";

  assignments.forEach((a, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-action" + (i === 0 ? " active-tab" : "");
    btn.textContent = a.quiz_id;
    btn.dataset.quizId = a.quiz_id;
    btn.addEventListener("click", () => {
      tabBar.querySelectorAll("button").forEach(b => b.classList.remove("active-tab"));
      btn.classList.add("active-tab");
      renderAdaptiveTabContent(content, userId, a.quiz_id);
    });
    tabBar.append(btn);
  });

  panel.append(tabBar, content);
  return panel;
}

async function loadAdaptiveAnalytics(userId, panel) {
  const firstTab = panel.querySelector(".adaptive-tab-bar button");
  if (!firstTab) return;
  const content = panel.querySelector(".adaptive-tab-content");
  renderAdaptiveTabContent(content, userId, firstTab.dataset.quizId);
}

async function renderAdaptiveTabContent(container, userId, quizId) {
  container.replaceChildren(createEmptyState("Loading…"));

  const { data, error } = await supabaseClient.rpc("admin_get_adaptive_analytics", {
    p_user_id: userId,
    p_quiz_id: quizId
  });

  if (error || !data) {
    container.replaceChildren(createEmptyState("No data yet."));
    return;
  }

  container.replaceChildren();

  // Level + EMA row
  const stats = document.createElement("div");
  stats.className = "adaptive-stats";

  const lvl = createAdaptiveStat("Level", `${data.current_level ?? "-"} / 100`);
  const ema = createAdaptiveStat(
    "EMA score",
    data.ema_score != null ? `${Math.round(data.ema_score * 100)}%` : "-"
  );
  const conf = createAdaptiveStat(
    "Confidence",
    data.confidence != null ? `${Math.round(data.confidence * 100)}%` : "-"
  );
  const sessions = createAdaptiveStat("Sessions", data.total_sessions ?? 0);

  stats.append(lvl, ema, conf, sessions);
  container.append(stats);

  // Weak / strong topics
  if (data.weak_topics?.length) {
    const wt = document.createElement("p");
    wt.className = "progress-meta";
    wt.textContent = `Weak topics: ${data.weak_topics.join(", ")}`;
    container.append(wt);
  }
  if (data.strong_topics?.length) {
    const st = document.createElement("p");
    st.className = "progress-meta";
    st.textContent = `Strong topics: ${data.strong_topics.join(", ")}`;
    container.append(st);
  }

  // Today's aggregate
  if (data.today_aggregate) {
    const agg = data.today_aggregate;
    const today = document.createElement("p");
    today.className = "progress-meta";
    today.textContent = `Today: ${agg.attempt_count} attempts · ${agg.correct_qs}/${agg.total_qs} correct${agg.evaluated ? " (evaluated)" : " (pending)"}`;
    container.append(today);
  }

  // Override control
  const overrideSection = document.createElement("div");
  overrideSection.className = "adaptive-override";
  const overrideLabel = document.createElement("label");
  overrideLabel.textContent = "Override level ";
  const overrideInput = document.createElement("input");
  overrideInput.type = "number";
  overrideInput.min = 1;
  overrideInput.max = 100;
  overrideInput.value = data.current_level ?? 50;
  overrideInput.style.width = "4rem";
  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.placeholder = "Reason (optional)";
  noteInput.style.marginLeft = "0.5rem";
  const overrideBtn = document.createElement("button");
  overrideBtn.type = "button";
  overrideBtn.className = "mini-action";
  overrideBtn.textContent = "Apply";
  const overrideMsg = document.createElement("span");
  overrideMsg.className = "form-message compact-message";
  overrideBtn.addEventListener("click", async () => {
    const level = parseInt(overrideInput.value, 10);
    if (!level || level < 1 || level > 100) {
      overrideMsg.textContent = "Enter a number between 1 and 100.";
      return;
    }
    overrideBtn.disabled = true;
    overrideMsg.textContent = "Saving…";
    const { error: overrideError } = await supabaseClient.rpc("admin_override_quiz_level", {
      p_user_id: userId,
      p_quiz_id: quizId,
      p_level:   level,
      p_note:    noteInput.value || null
    });
    overrideBtn.disabled = false;
    if (overrideError) {
      overrideMsg.textContent = overrideError.message || "Could not apply override.";
    } else {
      overrideMsg.textContent = `Level set to ${level}.`;
      renderAdaptiveTabContent(container, userId, quizId);
    }
  });
  overrideLabel.append(overrideInput);
  overrideSection.append(overrideLabel, noteInput, overrideBtn, overrideMsg);
  container.append(overrideSection);

  // Adjustment history table
  if (data.recent_adjustments?.length) {
    const histHeading = document.createElement("h5");
    histHeading.textContent = "Adjustment history";
    const table = document.createElement("table");
    table.className = "adaptive-history-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Date", "Before", "After", "Trigger", "Accuracy", "Note"].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    });
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    data.recent_adjustments.forEach(adj => {
      const tr = document.createElement("tr");
      appendTableCell(tr, formatDate(adj.date));
      appendTableCell(tr, adj.previous_level);
      appendTableCell(tr, adj.new_level);
      appendTableCell(tr, adj.trigger);
      appendTableCell(tr, adj.accuracy != null ? `${Math.round(adj.accuracy * 100)}%` : "-");
      appendTableCell(tr, adj.admin_note || "");
      tbody.append(tr);
    });
    table.append(thead, tbody);
    container.append(histHeading, table);
  }
}

function createAdaptiveStat(label, value) {
  const stat = document.createElement("div");
  stat.className = "adaptive-stat";

  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.textContent = String(value);

  stat.append(labelEl, valueEl);
  return stat;
}

function appendTableCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value == null ? "" : String(value);
  row.append(cell);
}
