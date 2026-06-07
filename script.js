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
    setMessage(message, "Checking account...");

    const formData = new FormData(form);
    const username = String(formData.get("username")).trim().toLowerCase();
    const password = String(formData.get("password"));

    try {
      const { data: loginData, error: resolveError } = await supabaseClient.rpc("resolve_login", {
        requested_username: username
      });

      const loginEmail = Array.isArray(loginData) ? loginData[0]?.login_email : loginData?.login_email;

      if (resolveError || !loginEmail) {
        throw new Error("Username was not found.");
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
  document.querySelector("#dashboardTitle").textContent = `Hi ${currentProfile.display_name}.`;
  document.querySelector("#profileAvatar").textContent = currentProfile.avatar || "⭐";
  document.querySelector("#profileName").textContent = currentProfile.display_name;
  document.querySelector("#profileSummary").textContent = currentProfile.role === "admin"
    ? "Admin account. You can manage quiz access and review progress."
    : "These are the quizzes assigned to your account.";

  const adminButton = document.querySelector("#adminViewButton");
  adminButton.hidden = currentProfile.role !== "admin";
  adminButton.addEventListener("click", renderAdmin);
  document.querySelector("#logoutButton").addEventListener("click", logout);

  const assignments = await fetchAssignments(currentProfile.id);
  renderAssignedQuizzes(assignments.map((item) => item.quiz_id));
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

function renderAssignedQuizzes(assignedIds) {
  const grid = document.querySelector("#assignedQuizGrid");
  const allowed = quizCatalog.filter((quiz) => assignedIds.includes(quiz.id));

  if (!allowed.length) {
    grid.replaceChildren(createEmptyState("No quizzes are assigned yet."));
    return;
  }

  allowed.forEach((quiz) => grid.append(createQuizTile(quiz)));
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

async function renderAdmin() {
  renderTemplate("adminTemplate");
  document.querySelector("#backToDashboardButton").addEventListener("click", renderDashboard);
  document.querySelector("#adminLogoutButton").addEventListener("click", logout);
  renderAssignmentCheckboxes(document.querySelector("#newUserAssignments"), []);
  document.querySelector("#createUserForm").addEventListener("submit", createUser);
  await renderAdminUsers();
  await renderAdminActivity();
}

function renderAssignmentCheckboxes(container, selectedIds) {
  const legend = container.querySelector("legend") || document.createElement("legend");
  legend.textContent = "Quiz access";
  container.replaceChildren(legend);

  quizCatalog.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = quiz.id;
    input.checked = selectedIds.includes(quiz.id);
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
  const quizIds = [...document.querySelectorAll("#newUserAssignments input:checked")].map((input) => input.value);

  setMessage(message, "Creating user...");

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
        quizIds
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
  list.replaceChildren(createEmptyState("Loading users..."));

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
    const selectedIds = assignments.map((item) => item.quiz_id);
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
    deleteButton.textContent = "Delete account";
    deleteButton.hidden = user.id === currentProfile.id;
    const passwordMessage = document.createElement("p");
    passwordMessage.className = "form-message compact-message";
    actions.append(saveButton, passwordButton, deleteButton);
    content.append(name, meta, fieldset, passwordReset, actions, passwordMessage);
    row.append(content);

    renderAssignmentCheckboxes(fieldset, selectedIds);
    saveButton.addEventListener("click", () => saveAssignments(user.id, fieldset, saveButton));
    passwordButton.addEventListener("click", () => updateUserPassword(user.id, passwordInput, passwordMessage));
    deleteButton.addEventListener("click", () => deleteUserAccount(user, passwordMessage));
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
  const selectedIds = [...fieldset.querySelectorAll("input:checked")].map((input) => input.value);
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Saving...";

  const { error } = await supabaseClient.rpc("admin_set_assignments", {
    target_user_id: userId,
    selected_quiz_ids: selectedIds
  });

  if (error) {
    button.disabled = false;
    button.textContent = originalText;
    window.alert(error.message || "Could not save quiz access.");
    return;
  }

  await renderAdminUsers();
}

async function updateUserPassword(userId, input, message) {
  const password = input.value;
  setMessage(message, "Changing password...");

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

  setMessage(message, "Deleting account...");

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
  list.replaceChildren(createEmptyState("Loading activity..."));

  const { data: progress, error } = await supabaseClient
    .from("quiz_progress")
    .select("user_id, quiz_id, score, total, level, details, completed_at")
    .order("completed_at", { ascending: false })
    .limit(50);

  if (error) {
    list.replaceChildren(createEmptyState("Could not load activity."));
    return;
  }

  if (!progress?.length) {
    list.replaceChildren(createEmptyState("No quiz activity yet."));
    return;
  }

  const [profiles, quizzes] = await Promise.all([fetchProfilesForActivity(), fetchQuizzesForActivity()]);
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const quizMap = new Map(quizzes.map((quiz) => [quiz.id, quiz]));

  list.replaceChildren();
  progress.forEach((item) => {
    list.append(createActivityItem(item, profileMap.get(item.user_id), quizMap.get(item.quiz_id)));
  });
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

function createActivityItem(item, profile, quiz) {
  const row = document.createElement("article");
  row.className = "activity-item";

  const header = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${profile?.display_name || "Deleted user"} · ${quiz?.title || item.quiz_id}`;
  const meta = document.createElement("div");
  meta.className = "progress-meta";
  meta.textContent = `${profile?.username ? `@${profile.username} · ` : ""}${item.level || "Practice"} · ${new Date(item.completed_at).toLocaleString()}`;
  header.append(title, meta);

  const score = document.createElement("div");
  score.className = "progress-score";
  score.textContent = `${item.score}/${item.total}`;

  const summary = document.createElement("p");
  summary.className = "activity-summary";
  summary.textContent = summarizeProgressDetails(item.details);

  row.append(header, score, summary);

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
    return "No answer details recorded.";
  }

  if (Array.isArray(details.answers)) {
    const correct = details.answers.filter((answer) => answer.correct).length;
    const wrong = details.answers.length - correct;
    return `${details.answers.length} answers tracked: ${correct} correct, ${wrong} wrong.`;
  }

  if (Number.isFinite(details.wrongCount)) {
    return `${details.wrongCount} wrong answers recorded.`;
  }

  return "Details recorded for review.";
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentSession = null;
  currentProfile = null;
  renderLogin();
}
