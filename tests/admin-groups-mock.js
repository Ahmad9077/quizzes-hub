// A stand-in for Supabase with made-up accounts, for trying the Admin page in a browser and for
// tests/admin-groups.cjs. It never talks to the real project. The group rules here follow
// supabase/migrations/026_admin_groups.sql, which tests/admin-groups-sql.mjs checks on Postgres.
(() => {
  const ADMIN_ID = "u-admin";
  const people = [
    ["u-1", "noura_a", "نورة أحمد"],
    ["u-2", "fahad_s", "فهد سالم"],
    ["u-3", "sara_k", "سارة خالد"],
    ["u-4", "yousef_m", "يوسف محمد"],
    ["u-5", "mariam_h", "مريم حسن"],
    ["u-6", "abdullah_n", "عبدالله ناصر"],
    ["u-7", "lulwa_b", "لولوة بدر"],
    ["u-8", "hamad_f", "حمد فيصل"]
  ];
  const db = {
    profiles: [
      { id: ADMIN_ID, username: "admin", display_name: "المدير", role: "admin", avatar: "⭐", active: true },
      ...people.map(([id, username, display_name]) => ({ id, username, display_name, role: "user", avatar: "🚀", active: true }))
    ],
    quiz_assignments: [
      { user_id: "u-1", quiz_id: "world-flags", difficulty: "medium", direct: true },
      { user_id: "u-2", quiz_id: "spelling", difficulty: "medium", direct: true },
      { user_id: "u-1", quiz_id: "math-grade1", difficulty: "medium", direct: false },
      { user_id: "u-1", quiz_id: "arabic-grade1", difficulty: "medium", direct: false },
      { user_id: "u-2", quiz_id: "math-grade1", difficulty: "medium", direct: false },
      { user_id: "u-2", quiz_id: "arabic-grade1", difficulty: "medium", direct: false },
      { user_id: "u-3", quiz_id: "math-grade1", difficulty: "medium", direct: false },
      { user_id: "u-3", quiz_id: "arabic-grade1", difficulty: "medium", direct: false }
    ],
    quiz_groups: [{ id: "g-1", name: "الأول الابتدائي" }],
    quiz_group_members: [
      { group_id: "g-1", user_id: "u-1" },
      { group_id: "g-1", user_id: "u-2" },
      { group_id: "g-1", user_id: "u-3" }
    ],
    quiz_group_quizzes: [
      { group_id: "g-1", quiz_id: "math-grade1" },
      { group_id: "g-1", quiz_id: "arabic-grade1" }
    ],
    quiz_progress: [
      { user_id: "u-1", quiz_id: "math-grade1", score: 7, total: 8, level: "Practice", details: {}, completed_at: "2026-11-05T15:20:00Z" },
      { user_id: "u-2", quiz_id: "arabic-grade1", score: 5, total: 8, level: "Practice", details: {}, completed_at: "2026-11-06T16:05:00Z" }
    ]
  };
  window.__previewDb = db;
  let nextId = 100;

  function quizzesRows() {
    // eslint-disable-next-line no-undef
    return assignmentCatalog.map((quiz, sort_order) => ({ id: quiz.id, title: quiz.title, sort_order }));
  }

  // The same two steps as public.sync_group_assignments().
  function sync() {
    const grants = new Set();
    db.quiz_group_members.forEach((m) => {
      db.quiz_group_quizzes.filter((q) => q.group_id === m.group_id).forEach((q) => grants.add(`${m.user_id}|${q.quiz_id}`));
    });
    grants.forEach((grant) => {
      const [user_id, quiz_id] = grant.split("|");
      if (!db.quiz_assignments.some((a) => a.user_id === user_id && a.quiz_id === quiz_id)) {
        db.quiz_assignments.push({ user_id, quiz_id, difficulty: "medium", direct: false });
      }
    });
    db.quiz_assignments = db.quiz_assignments.filter((a) => a.direct || grants.has(`${a.user_id}|${a.quiz_id}`));
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
    }
    select() { return this; }
    eq(column, value) { this.filters.push((row) => row[column] === value); return this; }
    order(column, options = {}) { this.sortBy = [column, options.ascending === false ? -1 : 1]; return this; }
    limit(count) { this.count = count; return this; }
    single() { this.one = true; return this; }
    maybeSingle() { this.one = true; return this; }
    then(resolve) {
      let rows = this.table === "quizzes" ? quizzesRows() : db[this.table] || [];
      rows = rows.filter((row) => this.filters.every((test) => test(row))).map((row) => ({ ...row }));
      if (this.sortBy) {
        const [column, way] = this.sortBy;
        rows.sort((a, b) => String(a[column]).localeCompare(String(b[column]), "ar") * way);
      }
      if (this.count) rows = rows.slice(0, this.count);
      resolve({ data: this.one ? rows[0] ?? null : rows, error: null });
    }
  }

  const fail = (message) => ({ data: null, error: { message } });
  const nameIssue = (name, id) => {
    const clean = String(name || "").trim();
    if (clean.length < 2 || clean.length > 60) return "Group name is required.";
    if (db.quiz_groups.some((group) => group.name === clean && group.id !== id)) return "Group name is taken.";
    return null;
  };

  const rpcs = {
    list_open_challenge_sessions: () => ({ data: [], error: null }),
    admin_get_adaptive_analytics: () => fail("غير متاح في المعاينة."),
    admin_create_group({ group_name }) {
      const issue = nameIssue(group_name);
      if (issue) return fail(issue);
      const id = `g-${(nextId += 1)}`;
      db.quiz_groups.push({ id, name: group_name.trim() });
      return { data: id, error: null };
    },
    admin_rename_group({ target_group_id, group_name }) {
      const issue = nameIssue(group_name, target_group_id);
      if (issue) return fail(issue);
      db.quiz_groups.find((group) => group.id === target_group_id).name = group_name.trim();
      return { data: null, error: null };
    },
    admin_delete_group({ target_group_id }) {
      db.quiz_groups = db.quiz_groups.filter((group) => group.id !== target_group_id);
      db.quiz_group_members = db.quiz_group_members.filter((row) => row.group_id !== target_group_id);
      db.quiz_group_quizzes = db.quiz_group_quizzes.filter((row) => row.group_id !== target_group_id);
      sync();
      return { data: null, error: null };
    },
    admin_set_group_quizzes({ target_group_id, quiz_ids, enabled }) {
      db.quiz_group_quizzes = db.quiz_group_quizzes.filter((row) => !(row.group_id === target_group_id && quiz_ids.includes(row.quiz_id)));
      if (enabled) quiz_ids.forEach((quiz_id) => db.quiz_group_quizzes.push({ group_id: target_group_id, quiz_id }));
      sync();
      return { data: null, error: null };
    },
    admin_set_group_members({ target_group_id, user_ids, enabled }) {
      db.quiz_group_members = db.quiz_group_members.filter((row) => !(row.group_id === target_group_id && user_ids.includes(row.user_id)));
      if (enabled) user_ids.forEach((user_id) => db.quiz_group_members.push({ group_id: target_group_id, user_id }));
      sync();
      return { data: null, error: null };
    },
    admin_set_assignments({ target_user_id, quiz_configs }) {
      const wanted = quiz_configs.map((config) => config.quiz_id);
      db.quiz_assignments.filter((a) => a.user_id === target_user_id).forEach((a) => { a.direct = wanted.includes(a.quiz_id); });
      wanted.forEach((quiz_id) => {
        if (!db.quiz_assignments.some((a) => a.user_id === target_user_id && a.quiz_id === quiz_id)) {
          db.quiz_assignments.push({ user_id: target_user_id, quiz_id, difficulty: "medium", direct: true });
        }
      });
      sync();
      return { data: null, error: null };
    },
    admin_delete_user({ target_user_id }) {
      db.profiles = db.profiles.filter((user) => user.id !== target_user_id);
      db.quiz_group_members = db.quiz_group_members.filter((row) => row.user_id !== target_user_id);
      db.quiz_assignments = db.quiz_assignments.filter((row) => row.user_id !== target_user_id);
      db.quiz_progress = db.quiz_progress.filter((row) => row.user_id !== target_user_id);
      return { data: null, error: null };
    }
  };

  window.QUIZZES_HUB_CONFIG = { supabaseUrl: "https://preview.invalid", supabaseAnonKey: "preview" };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: ADMIN_ID }, access_token: "preview" } } }),
        signOut: async () => ({})
      },
      from: (table) => new Query(table),
      rpc: async (name, args) => (rpcs[name] ? rpcs[name](args) : fail(`Not in the preview: ${name}`)),
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel() {}
    })
  };

  // The account function, as supabase/functions/admin-users/index.ts answers it.
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, options) => {
    if (!String(url).includes("/functions/v1/admin-users")) return realFetch(url, options);
    const body = JSON.parse(options.body);
    const answer = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
    if (body.action === "update-password") return answer({ id: body.userId, updated: true });
    if (!/^[a-z0-9_]{3,32}$/.test(body.username)) return answer({ error: "Username must be 3-32 lowercase letters, numbers, or underscores." }, 400);
    if (String(body.displayName).length < 2) return answer({ error: "Display name is required." }, 400);
    if (db.profiles.some((user) => user.username === body.username)) return answer({ error: "A user with this email address has already been registered" }, 400);
    const id = `u-${(nextId += 1)}`;
    db.profiles.push({ id, username: body.username, display_name: body.displayName, role: body.role, avatar: "🚀", active: true });
    (body.quizConfigs || []).forEach((config) => db.quiz_assignments.push({ user_id: id, quiz_id: config.quiz_id, difficulty: config.difficulty, direct: true }));
    return answer({ id, username: body.username, displayName: body.displayName, role: body.role });
  };

  // Open straight on the Admin page.
  const openAdmin = () => {
    const button = document.querySelector("#adminViewButton");
    if (button) button.click();
    else setTimeout(openAdmin, 30);
  };
  window.addEventListener("DOMContentLoaded", openAdmin);
})();
