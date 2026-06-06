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

      if (resolveError || !loginData?.login_email) {
        throw new Error("Username was not found.");
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginData.login_email,
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

  const [assignments, progress] = await Promise.all([fetchAssignments(currentProfile.id), fetchProgress(currentProfile.id)]);
  renderAssignedQuizzes(assignments.map((item) => item.quiz_id));
  renderProgress(progress);
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

async function fetchProgress(userId) {
  const { data, error } = await supabaseClient
    .from("quiz_progress")
    .select("quiz_id, score, total, level, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }

  return data || [];
}

function renderAssignedQuizzes(assignedIds) {
  const grid = document.querySelector("#assignedQuizGrid");
  const allowed = quizCatalog.filter((quiz) => assignedIds.includes(quiz.id));

  if (!allowed.length) {
    grid.innerHTML = `<p class="empty-state">No quizzes are assigned yet.</p>`;
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

function renderProgress(progress) {
  const list = document.querySelector("#progressList");

  if (!progress.length) {
    list.innerHTML = `<p class="empty-state">No quiz results yet.</p>`;
    return;
  }

  progress.forEach((item) => {
    const quiz = quizCatalog.find((entry) => entry.id === item.quiz_id);
    const row = document.createElement("article");
    row.className = "progress-item";
    row.innerHTML = `
      <div>
        <strong>${quiz?.title || item.quiz_id}</strong>
        <div class="progress-meta">${item.level || "Practice"} · ${new Date(item.completed_at).toLocaleString()}</div>
      </div>
      <div class="progress-score">${item.score}/${item.total}</div>
    `;
    list.append(row);
  });
}

async function renderAdmin() {
  renderTemplate("adminTemplate");
  document.querySelector("#backToDashboardButton").addEventListener("click", renderDashboard);
  document.querySelector("#adminLogoutButton").addEventListener("click", logout);
  renderAssignmentCheckboxes(document.querySelector("#newUserAssignments"), []);
  document.querySelector("#createUserForm").addEventListener("submit", createUser);
  await renderAdminUsers();
}

function renderAssignmentCheckboxes(container, selectedIds) {
  const legend = container.querySelector("legend") || document.createElement("legend");
  legend.textContent = "Quiz access";
  container.replaceChildren(legend);

  quizCatalog.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    label.innerHTML = `
      <input type="checkbox" value="${quiz.id}" ${selectedIds.includes(quiz.id) ? "checked" : ""}>
      <span>${quiz.icon} ${quiz.title}</span>
    `;
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
  list.innerHTML = `<p class="empty-state">Loading users...</p>`;

  const { data: users, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, role, avatar, active")
    .order("display_name");

  if (error) {
    list.innerHTML = `<p class="empty-state">Could not load users.</p>`;
    return;
  }

  list.replaceChildren();

  for (const user of users) {
    const assignments = await fetchAssignments(user.id);
    const selectedIds = assignments.map((item) => item.quiz_id);
    const row = document.createElement("article");
    row.className = "user-row";
    row.innerHTML = `
      <div>
        <strong>${user.avatar || "⭐"} ${user.display_name}</strong>
        <div class="progress-meta">@${user.username} · ${user.role}</div>
        <fieldset></fieldset>
        <div class="assignment-actions">
          <button class="mini-action save-access" type="button">Save access</button>
        </div>
      </div>
    `;
    const fieldset = row.querySelector("fieldset");
    renderAssignmentCheckboxes(fieldset, selectedIds);
    row.querySelector(".save-access").addEventListener("click", () => saveAssignments(user.id, fieldset));
    list.append(row);
  }
}

async function saveAssignments(userId, fieldset) {
  const selectedIds = [...fieldset.querySelectorAll("input:checked")].map((input) => input.value);
  await supabaseClient.from("quiz_assignments").delete().eq("user_id", userId);

  if (selectedIds.length) {
    await supabaseClient
      .from("quiz_assignments")
      .insert(selectedIds.map((quizId) => ({ user_id: userId, quiz_id: quizId })));
  }

  await renderAdminUsers();
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentSession = null;
  currentProfile = null;
  renderLogin();
}
