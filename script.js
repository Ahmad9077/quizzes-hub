const app = document.querySelector("#app");

const quizCatalog = [
  {
    id: "world-flags",
    title: "أعلام الدول",
    icon: "🌍",
    color: "#dff5ff",
    url: "https://ahmad9077.github.io/world-flags-quiz/"
  },
  {
    id: "country-map",
    title: "خريطة الدول",
    icon: "🗺️",
    color: "#e0faee",
    url: "https://ahmad9077.github.io/country-map-quiz/"
  },
  {
    id: "spelling",
    title: "تهجئة الكلمات",
    icon: "🔤",
    color: "#fff0bf",
    url: "https://ahmad9077.github.io/spelling-quiz/"
  },
  {
    id: "picture-reading",
    title: "اقرأ الصورة",
    icon: "📖",
    color: "#ffe4da",
    url: "https://ahmad9077.github.io/little-words-picture-quiz/"
  },
  {
    id: "english-word-choice",
    title: "اختر الكلمة الإنجليزية",
    icon: "🔠",
    color: "#e8ebff",
    url: "https://ahmad9077.github.io/english-word-choice-quiz/"
  },
  {
    id: "border-detective",
    title: "محقق الحدود",
    icon: "🧭",
    color: "#e8f2ff",
    url: "https://ahmad9077.github.io/country-border-letter-quiz/"
  },
  {
    id: "arabic-phonics",
    title: "صدى الحروف",
    icon: "أ",
    color: "#efe8ff",
    url: "https://ahmad9077.github.io/arabic-phonics-quiz/"
  },
  {
    id: "science-grade1",
    title: "علوم - بنات",
    icon: "🔬",
    color: "#e3f6dc",
    url: "https://ahmad9077.github.io/science-grade1-quiz/"
  },
  {
    id: "science-grade1-boys",
    title: "علوم - أولاد",
    icon: "🔬",
    color: "#dcecfb",
    url: "https://ahmad9077.github.io/science-grade1-quiz/boys/"
  },
  {
    id: "english-grade1",
    title: "English",
    icon: "🔤",
    color: "#ffe9b8",
    url: "https://ahmad9077.github.io/english-grade1-quiz/"
  }
];

const storyCollection = {
  id: "prophets-stories",
  title: "قصص الأنبياء",
  icon: "📚"
};
const quranCollections = [
  { id: "quran-al-balad", title: "القرآن الكريم - حمود", icon: "ق", group: "hamoud", countLabel: "٧ سور" },
  { id: "quran-deema", title: "القرآن الكريم - الأول الابتدائي", icon: "ق", group: "deema", countLabel: "٨ سور" }
];
const assignmentCatalog = [...quizCatalog, storyCollection, ...quranCollections];

// The interface is Arabic. Titles stored in the database are older English names, so screens
// show the catalog title when the activity is known.
function activityTitle(id, fallback) {
  return assignmentCatalog.find((item) => item.id === id)?.title || fallback || id;
}

// Arabic counted nouns: 1, 2, 3–10 and 11+ take different forms.
function countLabel(count, one, two, few, many) {
  if (count === 1) return one;
  if (count === 2) return two;
  if (count >= 3 && count <= 10) return `${count} ${few}`;
  return `${count} ${many}`;
}

const levelLabels = { adaptive: "تكيفي", Practice: "تدريب", practice: "تدريب" };
const topicLabels = {
  science_grade1: "علوم",
  topic_plants: "النبات",
  topic_movement: "الحركة",
  topic_covering: "الغطاء",
  topic_food: "الغذاء",
  topic_breathing: "التنفس",
  topic_reproduction: "التكاثر",
  english_grade1: "English",
  topic_case: "الحرف الكبير والصغير",
  topic_letters: "الحرف والصورة",
  topic_numbers: "الأرقام والعد",
  topic_missing: "الحرف الناقص"
};

// Messages that come back from Supabase and the admin-users function are in English.
const errorTranslations = [
  [/invalid login credentials/i, "اسم المستخدم أو كلمة المرور غير صحيحة."],
  [/already been registered|already exists|duplicate key/i, "اسم المستخدم مستخدم من قبل."],
  [/password should be at least (\d+)/i, (match) => `كلمة المرور لازم تكون ${match[1]} أحرف على الأقل.`],
  [/username must be 3-32/i, "اسم المستخدم من 3 إلى 32 حرفا إنجليزيا صغيرا أو رقما أو _ فقط."],
  [/display name is required/i, "الاسم الظاهر مطلوب."],
  [/password is required/i, "كلمة المرور مطلوبة."],
  [/admin access required/i, "هذا الإجراء يحتاج صلاحية مدير."],
  [/not signed in|not authenticated|jwt/i, "انتهت الجلسة، سجل الدخول من جديد."],
  [/failed to fetch|load failed|network/i, "تعذر الاتصال، تأكد من الإنترنت وحاول مرة ثانية."]
];

function arabicError(error, fallback) {
  const message = String(error?.message || error || "");
  for (const [pattern, text] of errorTranslations) {
    const match = message.match(pattern);
    if (match) return typeof text === "function" ? text(match) : text;
  }
  return fallback;
}

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
    setMessage(message, "جاري تسجيل الدخول…");

    const formData = new FormData(form);
    const username = String(formData.get("username")).trim().toLowerCase();
    const password = String(formData.get("password"));

    try {
      const { data: loginData, error: resolveError } = await supabaseClient.rpc("resolve_login", {
        requested_username: username
      });

      const loginEmail = Array.isArray(loginData) ? loginData[0]?.login_email : loginData?.login_email;

      if (resolveError || !loginEmail) {
        throw new Error("اسم المستخدم غير موجود.");
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
      setMessage(message, error.message === "اسم المستخدم غير موجود." ? error.message : arabicError(error, "تعذر تسجيل الدخول."), true);
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
  document.querySelector("#dashboardTitle").textContent = `مرحبا، ${currentProfile.display_name}`;

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

  const tiles = allowed.map(createQuizTile);
  if (assignmentMap.has(storyCollection.id)) {
    tiles.push(document.querySelector("#storiesTileTemplate").content.firstElementChild.cloneNode(true));
  }

  for (const collection of quranCollections) {
    if (!assignmentMap.has(collection.id)) continue;
    const tile = document.querySelector("#quranTileTemplate").content.firstElementChild.cloneNode(true);
    tile.href = "quran/?group=" + collection.group;
    tile.setAttribute("aria-label", collection.title);
    tile.querySelector(".quiz-name").textContent = collection.title;
    tile.querySelector(".start-pill").textContent = "اختر السورة · " + collection.countLabel;
    tiles.push(tile);
  }

  grid.replaceChildren(...(tiles.length ? tiles : [createEmptyState("لا توجد أنشطة مفعلة بعد.")]));
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
  tile.setAttribute("aria-label", `ابدأ ${quiz.title}`);
  tile.querySelector(".quiz-icon").textContent = quiz.icon;
  tile.querySelector(".quiz-name").textContent = quiz.title;
  return tile;
}

function renderChallengeMode(assignments) {
  const allowed = getAllowedQuizzes(assignments);
  const select = document.querySelector("#challengeQuizSelect");
  const createMessage = document.querySelector("#challengeCreateMessage");
  const createForm = document.querySelector("#createChallengeForm");
  const refreshButton = document.querySelector("#refreshChallengesButton");

  select.replaceChildren();

  if (!allowed.length) {
    select.disabled = true;
    createForm.querySelector("button").disabled = true;
    select.append(new Option("لا توجد اختبارات مسندة", ""));
  } else {
    allowed.forEach((quiz) => {
      select.append(new Option(`${quiz.icon} ${quiz.title}`, quiz.id));
    });
  }

  createForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(createMessage, "جاري الإنشاء…");

    const formData = new FormData(createForm);
    const quizId = String(formData.get("quizId") || "");

    try {
      const { data, error } = await supabaseClient.rpc("create_challenge_session", {
        p_quiz_id: quizId
      });

      if (error) throw error;

      setMessage(createMessage, "الجلسة جاهزة.");
      setChallengeState(data);
      await loadOpenChallenges();
    } catch (error) {
      setMessage(createMessage, arabicError(error, "تعذر إنشاء الجلسة."), true);
    }
  });

  refreshButton.addEventListener("click", () => {
    void loadOpenChallenges();
  });
  renderChallengeState();
  void loadOpenChallenges();
}

async function loadOpenChallenges() {
  const list = document.querySelector("#openChallengesList");
  if (!list) return;

  list.replaceChildren(createEmptyState("جاري التحميل…"));

  try {
    const { data, error } = await supabaseClient.rpc("list_open_challenge_sessions");
    if (error) throw error;

    if (!data?.length) {
      list.replaceChildren(createEmptyState("لا توجد جلسات مفتوحة."));
      return;
    }

    list.replaceChildren();
    data.forEach((session) => list.append(createOpenChallengeRow(session)));
  } catch (error) {
    console.error("Could not load challenge sessions.", error);
    list.replaceChildren(createEmptyState("تعذر تحميل الجلسات."));
  }
}

function createOpenChallengeRow(session) {
  const row = document.createElement("article");
  row.className = "challenge-row";

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${session.quiz_icon || "🎯"} ${activityTitle(session.quiz_id, session.quiz_title)}`;
  const meta = document.createElement("div");
  meta.className = "progress-meta";
  meta.textContent = `${session.host_display_name} · جلسة مفتوحة`;
  content.append(title, meta);

  const button = document.createElement("button");
  button.className = "mini-action";
  button.type = "button";
  button.textContent = "انضمام";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "جاري الانضمام…";
    try {
      const state = await joinChallengeSession(session.session_id, null);
      setChallengeState(state);
      await loadOpenChallenges();
    } catch (error) {
      window.alert(arabicError(error, "تعذر الانضمام إلى الجلسة."));
      button.disabled = false;
      button.textContent = "انضمام";
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
  title.textContent = `${currentChallengeState.quiz?.icon || "🎯"} ${activityTitle(currentChallengeState.quiz_id, currentChallengeState.quiz?.title)}`;
  const meta = document.createElement("p");
  meta.className = "progress-meta";
  meta.textContent = formatChallengeStatus(currentChallengeState.status);
  titleWrap.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "challenge-actions";

  if (currentChallengeState.status === "waiting" && currentChallengeState.host_id === currentProfile.id) {
    const startButton = document.createElement("button");
    startButton.className = "primary-action";
    startButton.type = "button";
    startButton.textContent = "ابدأ";
    startButton.disabled = (currentChallengeState.players || []).length !== 2;
    startButton.addEventListener("click", startCurrentChallenge);
    actions.append(startButton);
  }

  if (["waiting", "active"].includes(currentChallengeState.status)) {
    const cancelButton = document.createElement("button");
    cancelButton.className = "mini-action";
    cancelButton.type = "button";
    cancelButton.textContent = "مغادرة";
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
  meta.textContent = `${player.is_host ? "المضيف" : "لاعب"} · الأخطاء ${player.wrong_count}/3`;
  card.append(name, meta);
  return card;
}

function createWaitingPlayerCard() {
  const card = document.createElement("article");
  card.className = "challenge-player is-empty";
  const name = document.createElement("strong");
  name.textContent = "بانتظار لاعب";
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  meta.textContent = "متاحة لمن عنده نفس الاختبار";
  card.append(name, meta);
  return card;
}

function createChallengeStatusPanel(state) {
  const panel = document.createElement("div");
  panel.className = "challenge-status-panel";

  if (state.status === "waiting") {
    panel.append(createEmptyState("بانتظار لاعب آخر."));
    return panel;
  }

  if (state.status === "active") {
    const currentPlayer = (state.players || []).find((player) => player.user_id === state.current_answering_user_id);
    const message = document.createElement("p");
    message.className = "challenge-turn-message";
    message.textContent = state.current_answering_user_id === currentProfile.id
      ? "دورك"
      : `دور ${currentPlayer?.display_name || "اللاعب الآخر"}`;
    panel.append(message, createChallengeLaunchLink(state));
    return panel;
  }

  if (state.status === "finished") {
    const winner = (state.players || []).find((player) => player.user_id === state.winner_id);
    const message = document.createElement("p");
    message.className = "challenge-turn-message";
    message.textContent = winner ? `🎉 فاز ${winner.display_name}!` : "🎉 انتهى التحدي!";
    panel.append(message, createChallengeScoreSummary(state));
    return panel;
  }

  panel.append(createEmptyState("انتهى التحدي."));
  return panel;
}

function createChallengeScoreSummary(state) {
  const summary = document.createElement("div");
  summary.className = "progress-meta";
  summary.textContent = (state.players || [])
    .map((player) => `${player.display_name}: الأخطاء ${player.wrong_count}/3`)
    .join(" · ");
  return summary;
}

// The Hub is also served at haya-nt3lm.com (see cloudflare/). Quiz addresses stored in the
// database use the GitHub address; keep them on whichever address the Hub is open on, so the
// quiz shares this page's sign-in.
function localizeHubUrl(value) {
  const github = "https://ahmad9077.github.io";
  if (window.location.origin === github) return value;
  return String(value)
    .replace(`${github}/quizzes-hub/`, `${window.location.origin}/`)
    .replace(`${github}/`, `${window.location.origin}/`);
}

function createChallengeLaunchLink(state) {
  const link = document.createElement("a");
  link.className = "primary-action";
  link.href = buildChallengeQuizUrl(state);
  link.textContent = "افتح الاختبار";
  return link;
}

function buildChallengeQuizUrl(state) {
  const url = new URL(localizeHubUrl(state.quiz?.url || quizCatalog.find((quiz) => quiz.id === state.quiz_id)?.url || window.location.href));
  url.searchParams.set("challenge_session", state.id);
  return url.toString();
}

async function startCurrentChallenge() {
  if (!currentChallengeState?.id) return;

  const { data, error } = await supabaseClient.rpc("start_challenge_session", {
    p_session_id: currentChallengeState.id
  });

  if (error) {
    window.alert(arabicError(error, "تعذر بدء التحدي."));
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
    window.alert(arabicError(error, "تعذرت مغادرة التحدي."));
    return;
  }

  if (data?.status === "abandoned") {
    setChallengeState(null);
  } else {
    setChallengeState(data);
  }
  await loadOpenChallenges();
}

function formatChallengeStatus(status) {
  if (status === "waiting") return "بالانتظار";
  if (status === "active") return "جارية الآن";
  if (status === "finished") return "انتهت";
  return "منتهية";
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
  legend.textContent = "الأنشطة المتاحة";
  container.replaceChildren(legend);
  const assignmentMap = createAssignmentMap(assignments);

  assignmentCatalog.forEach((quiz) => {
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

  setMessage(message, "جاري الإنشاء…");

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
      throw new Error(arabicError(payload.error, "تعذر إنشاء المستخدم."));
    }

    form.reset();
    setMessage(message, "تم إنشاء المستخدم.");
    await renderAdminUsers();
  } catch (error) {
    setMessage(message, arabicError(error, error.message), true);
  }
}

async function renderAdminUsers() {
  const list = document.querySelector("#adminUsersList");
  list.replaceChildren(createEmptyState("جاري التحميل…"));

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, role, avatar, active")
    .order("display_name");

  if (error) {
    list.replaceChildren(createEmptyState("تعذر تحميل المستخدمين."));
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
    meta.textContent = `@${user.username} · ${user.role === "admin" ? "مدير" : "طفل"}`;
    const fieldset = document.createElement("fieldset");
    const passwordReset = document.createElement("label");
    passwordReset.className = "password-reset";
    const passwordText = document.createElement("span");
    passwordText.textContent = "كلمة مرور جديدة";
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.autocomplete = "new-password";
    passwordInput.placeholder = "كلمة مرور جديدة";
    passwordReset.append(passwordText, passwordInput);
    const actions = document.createElement("div");
    actions.className = "assignment-actions";
    const saveButton = document.createElement("button");
    saveButton.className = "mini-action save-access";
    saveButton.type = "button";
    saveButton.textContent = "حفظ الأنشطة";
    const passwordButton = document.createElement("button");
    passwordButton.className = "mini-action";
    passwordButton.type = "button";
    passwordButton.textContent = "تغيير كلمة المرور";
    const deleteButton = document.createElement("button");
    deleteButton.className = "mini-action danger-action";
    deleteButton.type = "button";
    deleteButton.textContent = "حذف";
    deleteButton.hidden = user.id === currentProfile.id;
    const adaptiveButton = document.createElement("button");
    adaptiveButton.className = "mini-action";
    adaptiveButton.type = "button";
    adaptiveButton.textContent = "المستوى التكيفي";
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
  button.textContent = "جاري الحفظ…";

  const { error } = await supabaseClient.rpc("admin_set_assignments", {
    target_user_id: userId,
    quiz_configs: quizConfigs
  });

  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    window.alert(arabicError(error, "تعذر حفظ الأنشطة."));
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
  setMessage(message, "جاري الحفظ…");

  if (!password) {
    setMessage(message, "كلمة المرور مطلوبة.", true);
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
      throw new Error(arabicError(payload.error, "تعذر تغيير كلمة المرور."));
    }

    input.value = "";
    setMessage(message, "تم تغيير كلمة المرور.");
  } catch (error) {
    setMessage(message, arabicError(error, error.message || "تعذر تغيير كلمة المرور."), true);
  }
}

async function deleteUserAccount(user, message) {
  const confirmed = window.confirm(`حذف حساب ${user.display_name} وكل نتائجه المحفوظة؟`);
  if (!confirmed) return;

  setMessage(message, "جاري الحذف…");

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
    setMessage(message, arabicError(error, "تعذر حذف الحساب."), true);
  }
}

async function renderAdminActivity() {
  const list = document.querySelector("#adminActivityList");
  list.replaceChildren(createEmptyState("جاري التحميل…"));

  const [profiles, quizzes, index] = await Promise.all([
    fetchProfilesForActivity(),
    fetchQuizzesForActivity(),
    fetchActivityIndex()
  ]);

  if (!profiles.length) {
    list.replaceChildren(createEmptyState("تعذر تحميل النشاط."));
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
    ? `${countLabel(stats.count, "محاولة واحدة", "محاولتان", "محاولات", "محاولة")} · آخرها ${formatDateTime(stats.last)}`
    : "لا يوجد نشاط";
  summary.append(name, meta);

  const body = document.createElement("div");
  body.className = "activity-list user-activity-items";
  group.append(summary, body);

  if (!stats) {
    body.append(createEmptyState("لا يوجد نشاط بعد."));
    return group;
  }

  // Activities load on first expand only
  let loaded = false;
  group.addEventListener("toggle", async () => {
    if (!group.open || loaded) return;
    loaded = true;
    body.replaceChildren(createEmptyState("جاري التحميل…"));

    const { data, error } = await supabaseClient
      .from("quiz_progress")
      .select("quiz_id, score, total, level, details, completed_at")
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: false })
      .limit(200);

    if (error) {
      loaded = false;
      body.replaceChildren(createEmptyState("تعذر تحميل النشاط."));
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
  title.textContent = activityTitle(item.quiz_id, quiz?.title);
  const meta = document.createElement("div");
  meta.className = "progress-meta";
  meta.textContent = `${levelLabels[item.level || "Practice"] || item.level} · ${formatDateTime(item.completed_at)}`;
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
    detailsSummary.textContent = "تفاصيل الإجابات";
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
    return `صحيحة ${correct} · خاطئة ${wrong}`;
  }

  if (Array.isArray(details.question_results)) {
    const correct = details.question_results.filter((result) => result.correct).length;
    return `صحيحة ${correct} · خاطئة ${details.question_results.length - correct}`;
  }

  if (Number.isFinite(details.wrongCount)) {
    return `خاطئة ${details.wrongCount}`;
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
  const gradedAssignments = assignments.filter((assignment) => quizCatalog.some((quiz) => quiz.id === assignment.quiz_id));
  const panel = document.createElement("div");
  panel.className = "adaptive-panel";
  panel.hidden = true;
  panel.dataset.userId = userId;

  const heading = document.createElement("h4");
  heading.textContent = "المستوى التكيفي";
  panel.append(heading);

  if (!gradedAssignments.length) {
    panel.append(createEmptyState("لا توجد اختبارات مسندة."));
    return panel;
  }

  const tabBar = document.createElement("div");
  tabBar.className = "adaptive-tab-bar";

  const content = document.createElement("div");
  content.className = "adaptive-tab-content";

  gradedAssignments.forEach((a, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mini-action" + (i === 0 ? " active-tab" : "");
    btn.textContent = activityTitle(a.quiz_id);
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
  container.replaceChildren(createEmptyState("جاري التحميل…"));

  const { data, error } = await supabaseClient.rpc("admin_get_adaptive_analytics", {
    p_user_id: userId,
    p_quiz_id: quizId
  });

  if (error || !data) {
    container.replaceChildren(createEmptyState("لا توجد بيانات بعد."));
    return;
  }

  container.replaceChildren();

  // Level + EMA row
  const stats = document.createElement("div");
  stats.className = "adaptive-stats";

  const lvl = createAdaptiveStat("المستوى", `${data.current_level ?? "-"} / 100`);
  const ema = createAdaptiveStat(
    "متوسط الأداء",
    data.ema_score != null ? `${Math.round(data.ema_score * 100)}%` : "-"
  );
  const conf = createAdaptiveStat(
    "الثقة",
    data.confidence != null ? `${Math.round(data.confidence * 100)}%` : "-"
  );
  const sessions = createAdaptiveStat("الجولات", data.total_sessions ?? 0);

  stats.append(lvl, ema, conf, sessions);
  container.append(stats);

  // Weak / strong topics
  if (data.weak_topics?.length) {
    const wt = document.createElement("p");
    wt.className = "progress-meta";
    wt.textContent = `يحتاج تقوية: ${data.weak_topics.map((topic) => topicLabels[topic] || topic).join("، ")}`;
    container.append(wt);
  }
  if (data.strong_topics?.length) {
    const st = document.createElement("p");
    st.className = "progress-meta";
    st.textContent = `نقاط قوة: ${data.strong_topics.map((topic) => topicLabels[topic] || topic).join("، ")}`;
    container.append(st);
  }

  // Today's aggregate
  if (data.today_aggregate) {
    const agg = data.today_aggregate;
    const today = document.createElement("p");
    today.className = "progress-meta";
    today.textContent = `اليوم: ${countLabel(agg.attempt_count, "محاولة واحدة", "محاولتان", "محاولات", "محاولة")} · صحيحة ${agg.correct_qs}/${agg.total_qs}${agg.evaluated ? " (تم التقييم)" : " (بانتظار التقييم)"}`;
    container.append(today);
  }

  // Override control
  const overrideSection = document.createElement("div");
  overrideSection.className = "adaptive-override";
  const overrideLabel = document.createElement("label");
  overrideLabel.textContent = "تعديل المستوى ";
  const overrideInput = document.createElement("input");
  overrideInput.type = "number";
  overrideInput.min = 1;
  overrideInput.max = 100;
  overrideInput.value = data.current_level ?? 50;
  overrideInput.style.width = "4rem";
  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.placeholder = "السبب (اختياري)";
  noteInput.style.marginInlineStart = "0.5rem";
  const overrideBtn = document.createElement("button");
  overrideBtn.type = "button";
  overrideBtn.className = "mini-action";
  overrideBtn.textContent = "تطبيق";
  const overrideMsg = document.createElement("span");
  overrideMsg.className = "form-message compact-message";
  overrideBtn.addEventListener("click", async () => {
    const level = parseInt(overrideInput.value, 10);
    if (!level || level < 1 || level > 100) {
      overrideMsg.textContent = "أدخل رقما من 1 إلى 100.";
      return;
    }
    overrideBtn.disabled = true;
    overrideMsg.textContent = "جاري الحفظ…";
    const { error: overrideError } = await supabaseClient.rpc("admin_override_quiz_level", {
      p_user_id: userId,
      p_quiz_id: quizId,
      p_level:   level,
      p_note:    noteInput.value || null
    });
    overrideBtn.disabled = false;
    if (overrideError) {
      overrideMsg.textContent = arabicError(overrideError, "تعذر تعديل المستوى.");
    } else {
      overrideMsg.textContent = `تم ضبط المستوى على ${level}.`;
      renderAdaptiveTabContent(container, userId, quizId);
    }
  });
  overrideLabel.append(overrideInput);
  overrideSection.append(overrideLabel, noteInput, overrideBtn, overrideMsg);
  container.append(overrideSection);

  // Adjustment history table
  if (data.recent_adjustments?.length) {
    const histHeading = document.createElement("h5");
    histHeading.textContent = "سجل التعديلات";
    const table = document.createElement("table");
    table.className = "adaptive-history-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["التاريخ", "قبل", "بعد", "السبب", "الدقة", "ملاحظة"].forEach(label => {
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
