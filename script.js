const app = document.querySelector("#app");

const quizCatalog = [
  {
    id: "world-flags",
    glyph: "flags",
    title: "أعلام الدول",
    icon: "🌍",
    color: "#dff5ff",
    book: "#2563a8",
    url: "https://ahmad9077.github.io/world-flags-quiz/"
  },
  {
    id: "country-map",
    glyph: "map",
    title: "خريطة الدول",
    icon: "🗺️",
    color: "#e0faee",
    book: "#2f7d4f",
    url: "https://ahmad9077.github.io/country-map-quiz/"
  },
  {
    id: "spelling",
    glyph: "spelling",
    title: "تهجئة الكلمات",
    icon: "🔤",
    color: "#fff0bf",
    book: "#a15c0d",
    url: "https://ahmad9077.github.io/spelling-quiz/"
  },
  {
    id: "picture-reading",
    glyph: "picture",
    title: "اقرأ الصورة",
    icon: "📖",
    color: "#ffe4da",
    book: "#b03a6e",
    url: "https://ahmad9077.github.io/little-words-picture-quiz/"
  },
  {
    id: "english-word-choice",
    glyph: "words",
    title: "اختر الكلمة الإنجليزية",
    icon: "🔠",
    color: "#e8ebff",
    book: "#4f46a5",
    url: "https://ahmad9077.github.io/english-word-choice-quiz/"
  },
  {
    id: "border-detective",
    glyph: "compass",
    title: "محقق الحدود",
    icon: "🧭",
    color: "#e8f2ff",
    book: "#b0521c",
    url: "https://ahmad9077.github.io/country-border-letter-quiz/"
  },
  {
    id: "arabic-phonics",
    glyph: "phonics",
    title: "صدى الحروف",
    icon: "أ",
    color: "#efe8ff",
    book: "#8f3b3b",
    url: "https://ahmad9077.github.io/arabic-phonics-quiz/"
  },
  {
    id: "science-grade1",
    world: "science",
    title: "علوم - بنات",
    icon: "🔬",
    color: "#e3f6dc",
    book: "#0e7490",
    url: "https://ahmad9077.github.io/science-grade1-quiz/"
  },
  {
    id: "science-grade1-boys",
    world: "science",
    title: "علوم - أولاد",
    icon: "🔬",
    color: "#dcecfb",
    book: "#0e7490",
    url: "https://ahmad9077.github.io/science-grade1-quiz/boys/"
  },
  {
    id: "english-grade1",
    world: "english",
    title: "English",
    icon: "🔤",
    color: "#ffe9b8",
    book: "#6e5aa6",
    url: "https://ahmad9077.github.io/english-grade1-quiz/"
  },
  {
    id: "arabic-grade1",
    world: "arabic",
    card: "اللغة العربية",
    title: "اللغة العربية - الأول الابتدائي",
    icon: "ع",
    color: "#d9f1ef",
    book: "#cc4338",
    url: "https://ahmad9077.github.io/arabic-grade1-quiz/"
  },
  {
    id: "math-grade1",
    world: "math",
    card: "الرياضيات",
    title: "الرياضيات - الأول الابتدائي",
    icon: "🔢",
    color: "#dcefff",
    book: "#f4c95d",
    url: "https://ahmad9077.github.io/math-grade1-quiz/"
  },
  {
    id: "social-grade1",
    world: "social",
    card: "الاجتماعيات",
    title: "الاجتماعيات - الأول الابتدائي",
    icon: "🇰🇼",
    color: "#e3f4ea",
    book: "#151c2e",
    url: "https://ahmad9077.github.io/social-grade1-quiz/"
  },
  {
    id: "islamic-grade1",
    world: "islamic",
    card: "التربية الإسلامية",
    title: "التربية الإسلامية - الأول الابتدائي",
    icon: "🕌",
    color: "#e2f3ee",
    book: "#1f7a63",
    url: "https://ahmad9077.github.io/islamic-grade1-quiz/"
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
  topic_habitats: "أين تعيش الكائنات الحية",
  topic_protect: "حماية أماكن عيش الكائنات الحية",
  topic_plants: "النبات",
  topic_movement: "الحركة",
  topic_covering: "الغطاء",
  topic_food: "الغذاء",
  topic_breathing: "التنفس",
  topic_reproduction: "التكاثر",
  english_grade1: "English",
  topic_case: "الحرف الكبير والصغير",
  topic_letters: "الحرف والرقم والصورة",
  topic_words: "الكلمة والصورة",
  topic_writing: "نسخ الكلمات والأرقام",
  topic_numbers: "الأرقام والعد",
  topic_missing: "الحرف الناقص",
  arabic_grade1: "اللغة العربية",
  topic_picture: "الحرف والصورة",
  topic_find: "الحرف في الكلمة",
  topic_form: "شكل الحرف",
  topic_blend: "تركيب الكلمة",
  topic_copy: "نسخ الحرفين",
  math_grade1: "الرياضيات",
  topic_sentence: "عبارة الجمع",
  topic_make45: "تكوين العددين ٤ و ٥",
  topic_make9: "تكوين العدد ٩",
  topic_count: "العد والأعداد",
  topic_order: "ترتيب الأعداد",
  topic_compare: "مقارنة الأعداد",
  topic_clock: "الساعة",
  topic_calendar: "التقويم وأيام الأسبوع",
  social_grade1: "الاجتماعيات",
  topic_amir: "أمير وطني",
  topic_home: "بيتي في وطني",
  topic_flag: "علم وطني",
  islamic_grade1: "التربية الإسلامية",
  topic_rabbi: "ربنا الله تعالى",
  topic_arkan: "أركان الإسلام",
  topic_ibada: "العبادة",
  topic_rasul: "الرسول محمد ﷺ",
  topic_walidain: "حب الوالدين وبرهما"
};

// Messages that come back from Supabase and the admin-users function are in English.
const errorTranslations = [
  [/invalid login credentials/i, "اسم المستخدم أو كلمة المرور غير صحيحة."],
  [/already been registered|already exists|duplicate key/i, "اسم المستخدم مستخدم من قبل."],
  [/group name is taken/i, "توجد مجموعة بهذا الاسم."],
  [/group name is required/i, "اكتب اسم المجموعة (حرفان على الأقل)."],
  [/group was not found/i, "المجموعة غير موجودة."],
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
let adminData = { users: [], assignments: [], groups: [], members: [], groupQuizzes: [] };
let adminTab = "groups";
const adminOpenGroups = new Set();
const adminOpenUsers = new Set();
const adminFilters = { users: { search: "", group: "all" }, activity: { search: "", group: "all" } };

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


// ─────────────────────────────────────────────────────────────────
// THE SKY IDENTITY (November 2026)
// One sky behind every page follows the child's local time; each school subject is a small
// world that moves; tapping an activity grows its card over the screen before the page opens.
// ─────────────────────────────────────────────────────────────────
const motionCalm = window.matchMedia("(prefers-reduced-motion: reduce)");
const EASE_SOFT = "cubic-bezier(.22, 1, .36, 1)";
const EASE_LEAVE = "cubic-bezier(.5, 0, .9, .4)";

// The colours of each school subject's world: its sky, its ground and the ground's edge.
// White writing on each ground passes 4.5:1.
const WORLD_COLOURS = {
  islamic: { a: "#0f8f86", g: "#0a6b68", d: "#075453" },
  arabic: { a: "#ff7257", g: "#c4381f", d: "#9a2a15" },
  english: { a: "#7b68f5", g: "#5a45d6", d: "#4331a8" },
  math: { a: "#ffa52e", g: "#b35400", d: "#8f4500" },
  science: { a: "#4ccb6b", g: "#18793a", d: "#115a2a" },
  social: { a: "#45a9ff", g: "#1766c2", d: "#114f98" }
};

const svgLine = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON = {
  forward: svgLine('<path d="M14.5 6l-6 6 6 6"/>'),
  home: svgLine('<path d="M4 11.2 12 4l8 7.2"/><path d="M6.2 9.8V19a1 1 0 0 0 1 1h9.6a1 1 0 0 0 1-1V9.8"/><path d="M10 20v-5h4v5"/>'),
  trophy: svgLine('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.2A2.8 2.8 0 0 0 8 9.5M16 5.5h2.8A2.8 2.8 0 0 1 16 9.5"/><path d="M12 13v4M8.5 20h7M10 17h4"/>'),
  eye: svgLine('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svgLine('<path d="M4 4l16 16"/><path d="M9.9 5.3A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.3 4.2M6.2 6.7C3.5 8.6 2 12 2 12s3.6 7 10 7c1.5 0 2.8-.4 4-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  refresh: svgLine('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>')
};

// ── Every subject is a little world, and everything in it moves ──
// Anything that moves sits inside a plain group that places it, so its animation never
// fights its position.
const at = (x, y, inner, extra = "") => `<g transform="translate(${x} ${y})${extra}">${inner}</g>`;
const skyRect = '<rect width="200" height="124" fill="var(--a)"/>';
const hill = '<path class="hill" d="M0 106Q50 95 100 101T200 99V124H0Z" fill="var(--g)"/>';
const star = (x, y, k, extra = "") => at(x, y, `<path class="tw ${extra}" d="M0-8l2.2 5.8L8 0 2.2 2.2 0 8l-2.2-5.8L-8 0l5.8-2.2z" fill="#ffe9a8"/>`, ` scale(${k})`);
const middle = 'text-anchor="middle" dominant-baseline="central"';
const word = (x, y, size, text, fill, extra = "") => `<text class="st" x="${x}" y="${y}" ${middle} font-size="${size}" fill="${fill}" ${extra}>${text}</text>`;
// A small letter or number that floats up and fades, again and again.
const riser = (x, y, text, delay, size = 13) => at(x, y, `<text class="st rise" ${middle} font-size="${size}" fill="#fff" style="animation-delay:${delay}s" direction="ltr">${text}</text>`);
const rays = Array.from({ length: 8 }, (_, n) => `<rect x="40.5" y="11" width="3" height="7" rx="1.5" fill="var(--cream)" transform="rotate(${n * 45} 42 34)"/>`).join("");
const block = (x, y, turn, letter, dy, fill, move) =>
  at(x, y, `<g class="${move}"><rect x="-19" y="-19" width="38" height="38" rx="10" fill="${fill}"/>${word(0, dy, 25, letter, "var(--d)")}</g>`, ` rotate(${turn})`);
// The sea: one wave repeated well past both edges, so its slide never shows an end.
const waves = (y) => `M-160 ${y}q20-7 40 0${"t40 0".repeat(13)}V124H-160Z`;
const bird = (x, y, k, delay) => at(x, y, `<g class="cross" style="animation-delay:${delay}s"><path class="flapb" d="M-8 0q4-5 8 0q4-5 8 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`, ` scale(${k})`);
const step = (x, top, numeral, order) =>
  `<g class="dip d${order}"><rect x="${x}" y="${top}" width="32" height="${112 - top}" rx="7" fill="#fff"/>${word(x + 16, top + 15, 19, numeral, "var(--d)")}</g>`;

const SCENES = {
  islamic: `${skyRect}${star(34, 26, 1)}${star(94, 18, 0.7, "b")}${star(186, 72, 0.6, "c")}${star(16, 84, 0.45, "b")}
    <circle class="tw b" cx="62" cy="48" r="1.8" fill="#fff"/><circle class="tw c" cx="116" cy="36" r="1.6" fill="#fff"/><circle class="tw" cx="18" cy="56" r="1.6" fill="#fff"/><circle class="tw c" cx="150" cy="78" r="1.4" fill="#fff"/>
    ${at(112, 10, '<path class="shoot" d="M0 0l-18 10" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>')}
    ${at(12, -6, '<g class="moon-s"><path d="M151.3 20A20 20 0 1 0 170.2 48.3 17 17 0 0 1 151.3 20Z" fill="var(--cream)"/></g>')}
    <rect x="50" y="76" width="66" height="36" rx="4" fill="#effffb"/>
    <path class="glow" d="M61 76a22 22 0 0 1 44 0z" fill="var(--cream)"/>
    <rect x="81.5" y="45" width="3" height="10" rx="1.5" fill="var(--cream)"/>
    <path d="M75 112V97a8 8 0 0 1 16 0v15z" fill="var(--g)"/>
    <rect class="glow b" x="57" y="84" width="7" height="11" rx="3.5" fill="var(--cream)"/><rect class="glow c" x="102" y="84" width="7" height="11" rx="3.5" fill="var(--cream)"/>
    <rect x="126" y="49" width="12" height="62" rx="2.5" fill="#effffb"/>
    <rect x="123" y="63" width="18" height="5" rx="2.5" fill="#c5efe7"/>
    <rect class="glow c" x="129.5" y="72" width="5" height="9" rx="2.5" fill="var(--cream)"/>
    <path d="M126 50a6 6 0 0 1 12 0z" fill="var(--cream)"/>
    <rect x="131" y="35" width="2" height="9" rx="1" fill="var(--cream)"/>${hill}`,
  arabic: `${skyRect}<circle class="float" cx="30" cy="32" r="4" fill="#fff"/><circle class="float" cx="172" cy="50" r="6" fill="#fff" style="animation-delay:-2s"/>${star(160, 24, 0.8)}${star(44, 62, 0.5, "b")}
    ${riser(36, 96, "ج", 0)}${riser(166, 98, "د", -1.7)}${riser(148, 100, "س", -3.3, 11)}${riser(56, 100, "م", -2.5, 11)}
    ${block(121, 85, 3, "ب", -2, "#fff", "wig")}${block(79, 85, -4, "ت", 2, "#fff", "wig b")}${block(100, 45, -7, "أ", 1, "var(--cream)", "bob")}${hill}`,
  english: `${skyRect}<circle class="float" cx="24" cy="26" r="4" fill="#fff"/><circle class="float" cx="184" cy="30" r="5" fill="#fff" style="animation-delay:-2s"/>
    ${riser(22, 98, "a", 0)}${riser(184, 100, "B", -1.5)}${riser(40, 100, "c", -3, 11)}${riser(170, 98, "d", -4, 11)}
    <g class="pop"><path d="M44 22h80a12 12 0 0 1 12 12v30a12 12 0 0 1-12 12H80L65 89V76H44a12 12 0 0 1-12-12V34a12 12 0 0 1 12-12z" fill="#fff"/>${word(84, 50, 30, "Abc", "var(--d)", 'direction="ltr"')}</g>
    <g class="pop b"><path d="M134 56h32a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-4v11l-12-11h-16a10 10 0 0 1-10-10V66a10 10 0 0 1 10-10z" fill="var(--cream)"/>${word(150, 74.5, 17, "Hi!", "var(--d)", 'direction="ltr"')}</g>
    ${star(118, 14, 0.6, "c")}${hill}`,
  math: `${skyRect}${at(30, 41, `<g class="turn">${word(0, 0, 28, "+", "#fff")}</g>`)}${at(178, 49, `<g class="pulse">${word(0, 0, 28, "=", "#fff")}</g>`)}
    ${riser(24, 98, "٤", -1)}${riser(182, 100, "٥", -3)}${star(120, 16, 0.6)}${star(44, 74, 0.45, "b")}
    ${step(128, 72, "١", 1)}${step(94, 50, "٢", 2)}${step(60, 28, "٣", 3)}
    <circle class="hop" cx="144" cy="64.5" r="7.5" fill="#1c2050"/>${hill}`,
  science: `${skyRect}<circle class="breathe" cx="42" cy="34" r="13" fill="var(--cream)"/><g class="spin">${rays}</g>
    <circle class="float" cx="146" cy="44" r="3" fill="#fff"/><circle class="float" cx="164" cy="70" r="2.2" fill="#fff" style="animation-delay:-1.5s"/><circle class="float" cx="130" cy="24" r="2" fill="#fff" style="animation-delay:-2.6s"/><circle class="float" cx="70" cy="76" r="2.4" fill="#fff" style="animation-delay:-.8s"/>
    <path d="M104 110C104 96 103 86 104 64" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path class="leaf l" d="M104 88C88 88 77 78 75 63c16 0 29 9 29 25z" fill="#fff"/>
    <path class="leaf r" d="M104 70c0-18 12-29 30-31 0 18-12 31-30 31z" fill="#fff"/>
    ${at(156, 30, '<g class="flutter"><g class="flap"><ellipse cx="-4.5" cy="0" rx="4.5" ry="6" fill="var(--cream)"/><ellipse cx="4.5" cy="0" rx="4.5" ry="6" fill="var(--cream)"/></g><rect x="-.9" y="-5" width="1.8" height="10" rx=".9" fill="#fff"/></g>')}${hill}`,
  social: `${skyRect}${bird(220, 24, 1, 0)}${bird(220, 40, 0.75, -5)}${bird(220, 16, 0.6, -8.5)}
    <polygon points="26,106 30.4,106 28.8,46 27.6,46" fill="#fff"/>
    <polygon points="44,106 52,106 49.2,18 46.8,18" fill="#fff"/><ellipse cx="48" cy="60" rx="12" ry="10" fill="#fff"/><ellipse cx="48" cy="60" rx="12" ry="3" fill="var(--a)" opacity=".4"/><ellipse cx="48" cy="37" rx="6.5" ry="5.5" fill="#fff"/>
    <polygon points="70,106 77,106 74.6,34 72.4,34" fill="#fff"/><ellipse cx="73.5" cy="64" rx="10" ry="8.5" fill="#fff"/><ellipse cx="73.5" cy="64" rx="10" ry="2.6" fill="var(--a)" opacity=".4"/>
    <circle class="glow" cx="48" cy="16" r="2.4" fill="var(--cream)"/><circle class="glow b" cx="73.5" cy="32" r="2" fill="var(--cream)"/><circle class="glow c" cx="28.2" cy="44" r="1.7" fill="var(--cream)"/>
    <path class="wave hill" d="${waves(100)}" fill="#9dd3ff" opacity=".7"/>
    <g class="boat"><path d="M110 92q28 11 58-3l-6 12q-22 8-44 0z" fill="var(--cream)"/><rect x="138" y="50" width="2.6" height="46" rx="1.3" fill="#fff"/><path d="M142 56 164 88l-22 2.5z" fill="#fff"/><path d="M136.5 62 118 89l18.5 1.5z" fill="#fff" opacity=".85"/><path class="pennant" d="M140.6 50h12l-3 3.5 3 3.5h-12z" fill="var(--cream)"/></g>
    <path class="wave f hill" d="${waves(107)}" fill="var(--g)"/>${star(92, 115, 0.4, "b")}${star(178, 113, 0.35, "c")}${star(30, 116, 0.3)}`
};
const sceneSvg = (id) => `<svg class="scene" viewBox="0 0 200 124" aria-hidden="true">${SCENES[id]}</svg>`;

// The other activities: line icons, each with one part that moves.
const moving = (body) => `<svg class="mv" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const MOVING = {
  stories: moving('<path d="M12 7C9.8 5.4 7 5 4 5.8v11.4c3-.8 5.8-.4 8 1.2"/><path d="M12 7v11.4"/><path d="M12 7c2.2-1.6 5-2 8-1.2v11.4c-3-.8-5.8-.4-8 1.2"/><path class="i-page" d="M12 7c2.2-1.6 5-2 8-1.2v11.4c-3-.8-5.8-.4-8 1.2z" fill="currentColor" fill-opacity=".35"/>'),
  quran: moving('<g class="i-turn"><rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.2"/></g><g class="i-turn back"><rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.2" transform="rotate(45 12 12)"/></g><circle class="i-dot" cx="12" cy="12" r="2" fill="currentColor"/>'),
  flags: moving('<path d="M6 21V4"/><path class="i-flag" d="M6 5h11l-2.4 3.5L17 12H6z"/>'),
  map: moving('<ellipse class="i-shadow" cx="12" cy="21" rx="4" ry="1.2" fill="currentColor" stroke="none" opacity=".4"/><g class="i-pin"><path d="M12 19.5s-5.8-5-5.8-9.6a5.8 5.8 0 0 1 11.6 0c0 4.6-5.8 9.6-5.8 9.6z"/><circle cx="12" cy="9.8" r="2.1"/></g>'),
  phonics: moving('<path d="M4 10v4h3l4.5 3.5v-11L7 10z"/><path class="i-w" d="M15.5 9.5a3.6 3.6 0 0 1 0 5"/><path class="i-w b" d="M18.2 7a7.2 7.2 0 0 1 0 10"/>'),
  spelling: moving('<rect class="i-bounce" x="2.5" y="9" width="5.6" height="5.6" rx="1.2"/><rect class="i-bounce b" x="9.2" y="9" width="5.6" height="5.6" rx="1.2"/><rect class="i-bounce c" x="15.9" y="9" width="5.6" height="5.6" rx="1.2"/><path d="M3 18.5h18"/>'),
  picture: moving('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle class="i-dot" cx="16" cy="9" r="1.8" fill="currentColor"/>'),
  words: moving('<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle class="i-w" cx="8.5" cy="11" r="1.2" fill="currentColor"/><circle class="i-w b" cx="12" cy="11" r="1.2" fill="currentColor"/><circle class="i-w c" cx="15.5" cy="11" r="1.2" fill="currentColor"/>'),
  compass: moving('<circle cx="12" cy="12" r="9"/><g class="i-needle"><path d="M12 5.5 14.4 12 12 18.5 9.6 12z" fill="currentColor" fill-opacity=".35"/><path d="M12 5.5 14.4 12H9.6z" fill="currentColor"/></g>')
};

// ── The sky follows the day ──
function moodNow() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "noon";
  if (hour >= 16 && hour < 18) return "sunset";
  return "night";
}

function greetingNow() {
  const hour = new Date().getHours();
  return hour >= 4 && hour < 12 ? "صباح الخير" : "مساء الخير";
}

function applyMood() {
  document.body.dataset.mood = moodNow();
}

/** The page's distance from the top, ignoring any transform that is still animating. */
function offsetTopOf(node) {
  let top = 0;
  for (let element = node; element; element = element.offsetParent) top += element.offsetTop;
  return top;
}

/** The horizon: where the sky ends and the page's white sheet begins. */
function setHorizon() {
  const screen = document.body.dataset.screen;
  let horizon = 320;
  const sheet = app.querySelector(".login-sheet");
  const top = app.querySelector(".top");
  if (screen === "login" && sheet) horizon = offsetTopOf(sheet) + (window.innerWidth >= 700 ? 118 : 2);
  else if (screen === "home" && top) horizon = offsetTopOf(top) + top.offsetHeight + 2;
  document.body.style.setProperty("--hz", `${Math.round(horizon)}px`);
}

function setScreen(name) {
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
  setHorizon();
}

function replayClass(node, name) {
  if (!node) return;
  node.classList.remove(name);
  void node.offsetWidth;
  node.classList.add(name);
}

function play(node, frames, options) {
  return node.animate(frames, { ...options, duration: motionCalm.matches ? 1 : options.duration, delay: motionCalm.matches ? 0 : options.delay || 0 });
}

// Small sparkles for happy moments.
function sparkle(node) {
  const layer = document.querySelector("#fx");
  if (motionCalm.matches || !layer || !node) return;
  const colours = ["#ffcb2e", "#ff7257", "#7b68f5", "#4ccb6b", "#45a9ff"];
  const box = node.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  for (let n = 0; n < 14; n += 1) {
    const bit = document.createElement("i");
    bit.style.cssText = `left:${x}px;top:${y}px;background:${colours[n % colours.length]};${n % 2 ? "border-radius:50%" : ""}`;
    layer.append(bit);
    const angle = (n / 14) * Math.PI * 2 + Math.random() * 0.5;
    const far = 60 + Math.random() * 70;
    bit.animate(
      [{ transform: "translate(-50%, -50%) scale(.3)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(angle) * far}px), calc(-50% + ${Math.sin(angle) * far}px)) scale(1) rotate(${Math.random() * 240}deg)`, opacity: 0 }],
      { duration: 700 + Math.random() * 400, easing: EASE_SOFT }
    ).onfinish = () => bit.remove();
  }
}

/** The colours of an activity: its world's, or a deeper shade of its own colour. */
function activityColours(item) {
  if (item.world && WORLD_COLOURS[item.world]) return WORLD_COLOURS[item.world];
  const base = item.book || "#5a45d6";
  return { a: base, g: `color-mix(in srgb, ${base} 82%, #000)`, d: `color-mix(in srgb, ${base} 64%, #000)` };
}

function paintColours(node, colours) {
  node.style.setProperty("--a", colours.a);
  node.style.setProperty("--g", colours.g);
  node.style.setProperty("--d", colours.d);
}

// ── Opening an activity: its card grows over the screen, then the page opens ──
function openActivity(tile) {
  const launch = document.querySelector("#launch");
  if (!launch || !launch.hidden) return;
  const scene = launch.querySelector(".launch-scene");
  const ground = launch.querySelector(".launch-ground");
  const world = tile.dataset.world;
  launch.style.cssText = tile.style.cssText;
  launch.querySelector(".launch-name").textContent = tile.querySelector(".quiz-name")?.textContent || "";
  launch.querySelector(".launch-line").textContent = tile.dataset.opening || "نجهز لك الاختبار";
  scene.innerHTML = world ? sceneSvg(world) : `<div class="launch-ico">${MOVING[tile.dataset.glyph] || ""}</div>`;
  const box = tile.getBoundingClientRect();
  const round = parseFloat(getComputedStyle(tile).borderTopLeftRadius) || 24;
  launch.hidden = false;
  document.body.classList.add("busy");
  play(launch, [
    { clipPath: `inset(${box.top}px ${window.innerWidth - box.right}px ${window.innerHeight - box.bottom}px ${box.left}px round ${round}px)` },
    { clipPath: "inset(0px 0px 0px 0px round 0px)" }
  ], { duration: 560, easing: EASE_SOFT });
  const cardScene = tile.querySelector(".scene");
  if (cardScene) {
    const start = cardScene.getBoundingClientRect();
    const end = scene.getBoundingClientRect();
    play(scene, [{ transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width})` }, { transform: "none" }], { duration: 640, easing: EASE_SOFT });
  } else {
    play(scene, [{ transform: "scale(.4)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 600, easing: EASE_SOFT });
  }
  play(ground, [{ transform: "translateY(70%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 560, easing: EASE_SOFT, delay: 90, fill: "backwards" });
  window.setTimeout(() => window.location.assign(tile.href), motionCalm.matches ? 60 : 640);
}

// Coming back with the browser's Back button shows the page as it was left: close the opening.
window.addEventListener("pageshow", () => {
  const launch = document.querySelector("#launch");
  if (launch) launch.hidden = true;
  document.body.classList.remove("busy");
});

function setupActivityOpening(grid) {
  grid.addEventListener("click", (event) => {
    const tile = event.target.closest("a.quiz-tile");
    if (!tile || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (tile.target && tile.target !== "_self") return;
    event.preventDefault();
    openActivity(tile);
  });
}

// ── The account sheet ──
function openAccountSheet() {
  const sheet = document.querySelector("#accountSheet");
  if (!sheet || !sheet.hidden) return;
  sheet.hidden = false;
  play(sheet.querySelector(".backdrop"), [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
  play(sheet.querySelector(".modal-card"), [{ transform: "translateY(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: EASE_SOFT });
  (sheet.querySelector("#adminViewButton:not([hidden])") || sheet.querySelector("#logoutButton")).focus({ preventScroll: true });
}

function closeAccountSheet() {
  const sheet = document.querySelector("#accountSheet");
  if (!sheet || sheet.hidden) return;
  sheet.hidden = true;
  document.querySelector("#avatarButton")?.focus({ preventScroll: true });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAccountSheet();
});

// ── The dock and its sliding pill ──
function movePill(bar) {
  const pill = bar?.querySelector(".pill");
  const active = bar?.querySelector(".active-tab");
  if (!pill || !active) return;
  pill.style.setProperty("--px", `${active.offsetLeft}px`);
  pill.style.setProperty("--pw", `${active.offsetWidth}px`);
}

function placePills() {
  document.querySelectorAll(".dock, .admin-tabs").forEach(movePill);
}

window.addEventListener("resize", () => {
  setHorizon();
  placePills();
});
window.addEventListener("scroll", () => {
  document.body.style.setProperty("--p", Math.min(1, window.scrollY / 150).toFixed(3));
}, { passive: true });

function startSky() {
  const stars = document.querySelector(".stars");
  if (stars && !stars.childElementCount) {
    stars.innerHTML = [[6, 12], [15, 44], [24, 20], [33, 62], [41, 9], [48, 38], [57, 70], [63, 16], [71, 48], [78, 26], [86, 60], [93, 14], [97, 42], [11, 76], [52, 84]]
      .map(([x, y], n) => `<i style="left:${x}%;top:${y}%;animation-delay:${-(n % 5) * 0.6}s;${n % 3 === 0 ? "width:6px;height:6px" : ""}"></i>`)
      .join("");
  }
  applyMood();
  window.setInterval(applyMood, 60000);
  window.setTimeout(() => document.body.classList.remove("boot"), 2200);
  document.fonts?.ready?.then(() => {
    setHorizon();
    placePills();
  });
}

startSky();

init();

async function init() {
  if (!isConfigured) {
    renderTemplate("setupTemplate");
    setScreen("setup");
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
  setScreen("login");
  const form = document.querySelector("#loginForm");
  const message = document.querySelector("#loginMessage");
  const toggle = document.querySelector("#togglePassword");
  const go = form.querySelector(".go");
  toggle.innerHTML = ICON.eye;

  toggle.addEventListener("click", () => {
    const input = form.elements.password;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.setAttribute("aria-pressed", String(!showing));
    toggle.setAttribute("aria-label", showing ? "إظهار كلمة المرور" : "إخفاء كلمة المرور");
    toggle.innerHTML = showing ? ICON.eye : ICON.eyeOff;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(message, "");
    go.disabled = true;
    go.innerHTML = '<span class="dots" aria-label="جاري تسجيل الدخول"><i></i><i></i><i></i></span>';

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
      go.disabled = false;
      go.textContent = "دخول";
      setHorizon();
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
  setScreen("home");
  document.querySelector("#helloSmall").textContent = greetingNow();
  document.querySelector("#dashboardTitle").textContent = `هلا ${currentProfile.display_name}!`;
  document.querySelector("#avatarButton").textContent = currentProfile.avatar || "⭐";
  document.querySelector("#accountAvatar").textContent = currentProfile.avatar || "⭐";
  document.querySelector("#accountName").textContent = currentProfile.display_name;
  document.querySelector("#quizzesTabButton").innerHTML = `${ICON.home}<span>الرئيسية</span>`;
  document.querySelector("#challengeTabButton").innerHTML = `${ICON.trophy}<span>التحدي</span>`;
  document.querySelector("#refreshChallengesButton").innerHTML = ICON.refresh;

  const adminButton = document.querySelector("#adminViewButton");
  adminButton.hidden = currentProfile.role !== "admin";
  adminButton.addEventListener("click", () => {
    closeAccountSheet();
    renderAdmin();
  });
  document.querySelector("#avatarButton").addEventListener("click", openAccountSheet);
  document.querySelectorAll("#accountSheet [data-close]").forEach((node) => node.addEventListener("click", closeAccountSheet));
  document.querySelector("#logoutButton").addEventListener("click", logout);
  setupActivityOpening(document.querySelector("#assignedQuizGrid"));

  dashboardAssignments = await fetchAssignments(currentProfile.id);
  setupDashboardTabs();
  renderAssignedQuizzes(dashboardAssignments);
  renderChallengeMode(dashboardAssignments);
  setHorizon();
  placePills();
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
    const stories = document.querySelector("#storiesTileTemplate").content.firstElementChild.cloneNode(true);
    stories.dataset.opening = "نفتح لك القصص";
    tiles.push(stories);
  }

  for (const collection of quranCollections) {
    if (!assignmentMap.has(collection.id)) continue;
    const tile = document.querySelector("#quranTileTemplate").content.firstElementChild.cloneNode(true);
    tile.href = "quran/?group=" + collection.group;
    tile.setAttribute("aria-label", collection.title);
    tile.querySelector(".quiz-name").textContent = collection.title;
    tile.querySelector(".start-pill").textContent = collection.countLabel;
    tile.dataset.opening = "نفتح لك السور";
    tiles.push(tile);
  }

  tiles.forEach((tile) => {
    if (tile.classList.contains("tile") && !tile.querySelector("svg")) tile.querySelector(".quiz-icon").innerHTML = MOVING[tile.dataset.glyph] || "";
  });
  const worlds = tiles.filter((tile) => tile.classList.contains("world"));
  const others = tiles.filter((tile) => !tile.classList.contains("world"));
  [...worlds, ...others].forEach((tile, index) => tile.style.setProperty("--i", String(index)));
  if (!tiles.length) {
    grid.replaceChildren(createEmptyState("لا توجد أنشطة مفعلة بعد."));
    return;
  }
  const parts = [];
  if (worlds.length) {
    const box = document.createElement("div");
    box.className = "worlds";
    box.append(...worlds);
    parts.push(box);
  }
  if (others.length) {
    if (worlds.length) {
      const heading = document.createElement("h2");
      heading.className = "sec second";
      heading.textContent = "قصص وأنشطة";
      parts.push(heading);
    }
    const box = document.createElement("div");
    box.className = "tiles";
    box.append(...others);
    parts.push(box);
  }
  grid.replaceChildren(...parts);
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
  document.querySelector("#quizzesTabButton").toggleAttribute("aria-current", !isChallenge);
  document.querySelector("#challengeTabButton").toggleAttribute("aria-current", isChallenge);
  if (!isChallenge) document.querySelector("#quizzesTabButton").setAttribute("aria-current", "page");
  if (isChallenge) document.querySelector("#challengeTabButton").setAttribute("aria-current", "page");
  movePill(document.querySelector(".dock"));
  document.querySelector("#helloSmall").textContent = isChallenge ? "وضع التحدي" : greetingNow();
  document.querySelector("#dashboardTitle").textContent = isChallenge ? "تحدي بين اثنين" : `هلا ${currentProfile.display_name}!`;
  window.scrollTo(0, 0);
  const panel = document.querySelector(isChallenge ? "#challengePanel" : "#quizzesPanel");
  replayClass(panel, "enter");
  play(panel, [{ opacity: 0, transform: `translateX(${isChallenge ? -36 : 36}px)` }, { opacity: 1, transform: "none" }], { duration: 460, easing: EASE_SOFT });
  if (isChallenge) loadOpenChallenges();
}

function getAllowedQuizzes(assignments) {
  const assignmentMap = createAssignmentMap(assignments);
  return quizCatalog.filter((quiz) => assignmentMap.has(quiz.id));
}

function createQuizTile(quiz) {
  const tile = document.createElement("a");
  tile.className = "quiz-tile";
  tile.href = quiz.url;
  tile.setAttribute("aria-label", `ابدأ ${quiz.title}`);
  paintColours(tile, activityColours(quiz));
  if (quiz.world) {
    tile.classList.add("world");
    tile.dataset.world = quiz.world;
    tile.innerHTML = `${sceneSvg(quiz.world)}<span class="foot"><span class="quiz-name"></span><span class="go-arrow" aria-hidden="true">${ICON.forward}</span></span>`;
  } else {
    tile.classList.add("tile");
    tile.dataset.glyph = quiz.glyph || "words";
    tile.innerHTML = `<span class="quiz-icon ico" aria-hidden="true">${MOVING[tile.dataset.glyph]}</span><span class="t"><span class="quiz-name"></span></span>`;
  }
  tile.querySelector(".quiz-name").textContent = quiz.card || quiz.title;
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
  renderChallengeChips(allowed, select);

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
      sparkle(document.querySelector("#activeChallengeCard"));
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

function renderChallengeChips(allowed, select) {
  const chips = document.querySelector("#challengeChips");
  if (!chips) return;
  if (!allowed.length) {
    chips.replaceChildren(createEmptyState("لا توجد اختبارات مسندة"));
    return;
  }
  const mark = () => chips.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-checked", String(chip.dataset.quiz === select.value)));
  chips.replaceChildren(...allowed.map((quiz) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("role", "radio");
    chip.dataset.quiz = quiz.id;
    chip.textContent = quiz.card || quiz.title;
    paintColours(chip, activityColours(quiz));
    chip.addEventListener("click", () => {
      select.value = quiz.id;
      mark();
    });
    return chip;
  }));
  mark();
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
  paintColours(card, activityColours(quizCatalog.find((quiz) => quiz.id === currentChallengeState.quiz_id) || {}));
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

// ─────────────────────────────────────────────────────────────────
// ADMIN
// Three tabs: groups, users, activity. A group holds members and activities; the database
// fills quiz_assignments from it (supabase/migrations/026_admin_groups.sql), so everything else
// on the site keeps reading quiz_assignments.
// ─────────────────────────────────────────────────────────────────
async function renderAdmin() {
  renderTemplate("adminTemplate");
  setScreen("admin");
  document.querySelector("#backToDashboardButton").addEventListener("click", renderDashboard);
  document.querySelector("#adminLogoutButton").addEventListener("click", logout);
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => activateAdminTab(button.dataset.adminTab));
  });
  document.querySelector("#createGroupForm").addEventListener("submit", createGroup);
  document.querySelector("#createUserForm").addEventListener("submit", createUser);
  renderAssignmentCheckboxes(document.querySelector("#newUserAssignments"), []);
  setupAdminFilter("users", renderAdminUsersList);
  setupAdminFilter("activity", applyAdminActivityFilter);
  await activateAdminTab(adminTab);
}

async function activateAdminTab(tabName) {
  adminTab = tabName;
  document.querySelector("#adminGroupsPanel").hidden = tabName !== "groups";
  document.querySelector("#adminUsersPanel").hidden = tabName !== "users";
  document.querySelector("#adminActivityPanel").hidden = tabName !== "activity";
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active-tab", button.dataset.adminTab === tabName);
    button.setAttribute("aria-pressed", String(button.dataset.adminTab === tabName));
  });
  movePill(document.querySelector(".admin-tabs"));

  if (tabName === "groups") await renderAdminGroups();
  if (tabName === "users") await renderAdminUsers();
  if (tabName === "activity") await renderAdminActivity();
}

/** Everything the Admin screens show, read at once instead of one request per account. */
async function loadAdminData() {
  const [users, assignments, groups, members, groupQuizzes] = await Promise.all([
    supabaseClient.from("profiles").select("id, username, display_name, role, avatar, active").order("display_name"),
    supabaseClient.from("quiz_assignments").select("user_id, quiz_id, difficulty, direct"),
    supabaseClient.from("quiz_groups").select("id, name").order("name"),
    supabaseClient.from("quiz_group_members").select("group_id, user_id"),
    supabaseClient.from("quiz_group_quizzes").select("group_id, quiz_id")
  ]);

  const failed = [users, assignments, groups, members, groupQuizzes].find((result) => result.error);
  if (failed) throw failed.error;

  adminData = {
    users: users.data || [],
    assignments: assignments.data || [],
    groups: groups.data || [],
    members: members.data || [],
    groupQuizzes: groupQuizzes.data || []
  };
}

function groupMemberIds(groupId) {
  return adminData.members.filter((row) => row.group_id === groupId).map((row) => row.user_id);
}

function groupQuizIds(groupId) {
  return adminData.groupQuizzes.filter((row) => row.group_id === groupId).map((row) => row.quiz_id);
}

function groupsOfUser(userId) {
  const ids = new Set(adminData.members.filter((row) => row.user_id === userId).map((row) => row.group_id));
  return adminData.groups.filter((group) => ids.has(group.id));
}

/** For one account: each activity its groups give it, and the names of those groups. */
function groupSourcesOfUser(userId) {
  const sources = new Map();
  groupsOfUser(userId).forEach((group) => {
    groupQuizIds(group.id).forEach((quizId) => {
      sources.set(quizId, [...(sources.get(quizId) || []), group.name]);
    });
  });
  return sources;
}

function membersLabel(count) {
  return count ? countLabel(count, "عضو واحد", "عضوان", "أعضاء", "عضوًا") : "بدون أعضاء";
}

function activitiesLabel(count) {
  return count ? countLabel(count, "نشاط واحد", "نشاطان", "أنشطة", "نشاطًا") : "بدون أنشطة";
}

/** A question inside the page; the browser's own confirm box is blocked in some views. */
function confirmDialog(message, confirmLabel = "تأكيد") {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "confirm-dialog";
    const text = document.createElement("p");
    text.textContent = message;
    const actions = document.createElement("div");
    actions.className = "assignment-actions";
    const finish = (answer) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    const yes = document.createElement("button");
    yes.className = "mini-action danger-action";
    yes.type = "button";
    yes.textContent = confirmLabel;
    yes.addEventListener("click", () => finish(true));
    const no = document.createElement("button");
    no.className = "mini-action";
    no.type = "button";
    no.textContent = "إلغاء";
    no.addEventListener("click", () => finish(false));
    actions.append(yes, no);
    dialog.append(text, actions);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    });
    document.body.append(dialog);
    dialog.showModal();
    no.focus();
  });
}

// ── Filters (users and activity tabs) ─────────────────────────────
function setupAdminFilter(name, onChange) {
  const root = document.querySelector(`[data-admin-filter="${name}"]`);
  const search = root.querySelector("input");
  const select = root.querySelector("select");
  search.value = adminFilters[name].search;
  search.addEventListener("input", () => {
    adminFilters[name].search = search.value;
    onChange();
  });
  select.addEventListener("change", () => {
    adminFilters[name].group = select.value;
    onChange();
  });
}

function fillGroupFilter(name) {
  const select = document.querySelector(`[data-admin-filter="${name}"] select`);
  select.replaceChildren(new Option("كل المجموعات", "all"), new Option("بدون مجموعة", "none"));
  adminData.groups.forEach((group) => select.append(new Option(group.name, group.id)));
  const wanted = adminFilters[name].group;
  const stillThere = wanted === "all" || wanted === "none" || adminData.groups.some((group) => group.id === wanted);
  adminFilters[name].group = stillThere ? wanted : "all";
  select.value = adminFilters[name].group;
}

function matchesAdminFilter(user, filter) {
  const query = filter.search.trim().toLowerCase();
  if (query && !user.display_name.toLowerCase().includes(query) && !user.username.includes(query)) return false;
  if (filter.group === "all") return true;
  const groups = groupsOfUser(user.id);
  return filter.group === "none" ? groups.length === 0 : groups.some((group) => group.id === filter.group);
}

// ── Groups tab ────────────────────────────────────────────────────
async function renderAdminGroups() {
  const list = document.querySelector("#adminGroupsList");
  if (!list.childElementCount) list.replaceChildren(createEmptyState("جاري التحميل…"));

  try {
    await loadAdminData();
  } catch {
    list.replaceChildren(createEmptyState("تعذر تحميل المجموعات."));
    return;
  }

  if (!adminData.groups.length) {
    list.replaceChildren(createEmptyState("لا توجد مجموعات بعد. اكتب اسم أول مجموعة في الأعلى."));
    return;
  }

  list.replaceChildren(...adminData.groups.map(createGroupCard));
}

async function createGroup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#createGroupMessage");
  const name = String(new FormData(form).get("groupName") || "");

  setMessage(message, "جاري الإنشاء…");
  const { data, error } = await supabaseClient.rpc("admin_create_group", { group_name: name });

  if (error) {
    setMessage(message, arabicError(error, "تعذر إنشاء المجموعة."), true);
    return;
  }

  form.reset();
  setMessage(message, "");
  adminOpenGroups.add(data);
  await renderAdminGroups();
}

function createGroupCard(group) {
  const card = document.createElement("details");
  card.className = "user-activity group-card";
  card.dataset.groupId = group.id;

  const summary = document.createElement("summary");
  const name = document.createElement("strong");
  name.textContent = group.name;
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  const renderMeta = () => {
    meta.textContent = `${membersLabel(groupMemberIds(group.id).length)} · ${activitiesLabel(groupQuizIds(group.id).length)}`;
  };
  renderMeta();
  summary.append(name, meta);

  const body = document.createElement("div");
  body.className = "admin-row-body";
  card.append(summary, body);

  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    buildGroupBody(group, body, renderMeta);
  };

  card.open = adminOpenGroups.has(group.id);
  if (card.open) build();
  card.addEventListener("toggle", () => {
    if (card.open) {
      adminOpenGroups.add(group.id);
      build();
    } else {
      adminOpenGroups.delete(group.id);
    }
  });
  return card;
}

function buildGroupBody(group, body, renderMeta) {
  const message = document.createElement("p");
  message.className = "form-message compact-message";

  const columns = document.createElement("div");
  columns.className = "group-columns";
  columns.append(buildGroupQuizzes(group, message, renderMeta), buildGroupMembers(group, message, renderMeta));

  body.append(message, columns, buildGroupSettings(group, message));
}

function buildGroupQuizzes(group, message, renderMeta) {
  const fieldset = document.createElement("fieldset");
  fieldset.className = "group-section";
  const legend = document.createElement("legend");
  legend.textContent = "أنشطة المجموعة";
  fieldset.append(legend);

  const chosen = new Set(groupQuizIds(group.id));
  assignmentCatalog.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = quiz.id;
    input.checked = chosen.has(quiz.id);
    const text = document.createElement("span");
    text.textContent = `${quiz.icon} ${quiz.title}`;
    label.append(input, text);
    fieldset.append(label);

    input.addEventListener("change", async () => {
      const enabled = input.checked;
      const memberCount = groupMemberIds(group.id).length;
      if (!enabled && memberCount) {
        const sure = await confirmDialog(
          `إزالة «${quiz.title}» من «${group.name}»؟ لن يظهر لأعضاء المجموعة، إلا من أُعطي له مباشرة أو من مجموعة أخرى. النتائج تبقى محفوظة.`,
          "إزالة النشاط"
        );
        if (!sure) {
          input.checked = true;
          return;
        }
      }

      input.disabled = true;
      setMessage(message, "جاري الحفظ…");
      const { error } = await supabaseClient.rpc("admin_set_group_quizzes", {
        target_group_id: group.id,
        quiz_ids: [quiz.id],
        enabled
      });
      input.disabled = false;

      if (error) {
        input.checked = !enabled;
        setMessage(message, arabicError(error, "تعذر الحفظ."), true);
        return;
      }

      await loadAdminData();
      renderMeta();
      setMessage(message, enabled ? `أصبح «${quiz.title}» متاحًا لكل أعضاء المجموعة.` : `أُزيل «${quiz.title}» من المجموعة.`);
    });
  });

  return fieldset;
}

function buildGroupMembers(group, message, renderMeta) {
  const section = document.createElement("div");
  section.className = "group-section";

  const heading = document.createElement("p");
  heading.className = "group-heading";
  const chips = document.createElement("div");
  chips.className = "member-chips";

  const adder = document.createElement("details");
  adder.className = "member-adder";
  const adderTitle = document.createElement("summary");
  adderTitle.textContent = "إضافة أعضاء من المستخدمين الحاليين";
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "ابحث بالاسم";
  search.setAttribute("aria-label", "ابحث عن مستخدم لإضافته");
  const candidates = document.createElement("div");
  candidates.className = "member-candidates";
  const addAll = document.createElement("button");
  addAll.className = "mini-action";
  addAll.type = "button";
  adder.append(adderTitle, search, addAll, candidates);

  const setMembers = async (userIds, enabled, done) => {
    setMessage(message, "جاري الحفظ…");
    const { error } = await supabaseClient.rpc("admin_set_group_members", {
      target_group_id: group.id,
      user_ids: userIds,
      enabled
    });

    if (error) {
      setMessage(message, arabicError(error, "تعذر الحفظ."), true);
      return;
    }

    await loadAdminData();
    render();
    renderMeta();
    setMessage(message, done);
  };

  const renderCandidates = () => {
    const inGroup = new Set(groupMemberIds(group.id));
    const query = search.value.trim().toLowerCase();
    const shown = adminData.users.filter((user) => {
      return !inGroup.has(user.id) && (!query || user.display_name.toLowerCase().includes(query) || user.username.includes(query));
    });

    addAll.hidden = shown.length < 2;
    addAll.textContent = `إضافة الكل (${shown.length})`;
    addAll.onclick = () => setMembers(shown.map((user) => user.id), true, "أُضيف الأعضاء إلى المجموعة.");

    if (!shown.length) {
      candidates.replaceChildren(createEmptyState("لا يوجد مستخدمون آخرون."));
      return;
    }

    candidates.replaceChildren(...shown.map((user) => {
      const label = document.createElement("label");
      label.className = "checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      const text = document.createElement("span");
      text.textContent = `${user.avatar || "⭐"} ${user.display_name}`;
      const username = document.createElement("span");
      username.className = "progress-meta";
      username.dir = "ltr";
      username.textContent = `@${user.username}`;
      label.append(input, text, username);
      input.addEventListener("change", () => setMembers([user.id], true, `أُضيف ${user.display_name} إلى المجموعة.`));
      return label;
    }));
  };

  const render = () => {
    const inGroup = new Set(groupMemberIds(group.id));
    const members = adminData.users.filter((user) => inGroup.has(user.id));
    heading.textContent = `أعضاء المجموعة (${members.length})`;

    if (!members.length) {
      chips.replaceChildren(createEmptyState("لا يوجد أعضاء بعد."));
    } else {
      chips.replaceChildren(...members.map((user) => {
        const chip = document.createElement("span");
        chip.className = "member-chip";
        const name = document.createElement("span");
        name.textContent = user.display_name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `إزالة ${user.display_name} من المجموعة`);
        remove.addEventListener("click", async () => {
          const sure = await confirmDialog(
            `إزالة ${user.display_name} من «${group.name}»؟ لن تظهر له أنشطة المجموعة، وتبقى أنشطته الخاصة وحسابه ونتائجه.`,
            "إزالة العضو"
          );
          if (sure) await setMembers([user.id], false, `أُزيل ${user.display_name} من المجموعة.`);
        });
        chip.append(name, remove);
        return chip;
      }));
    }

    renderCandidates();
  };

  search.addEventListener("input", renderCandidates);
  render();
  section.append(heading, chips, adder);
  return section;
}

function buildGroupSettings(group, message) {
  const section = document.createElement("form");
  section.className = "group-settings";

  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = "اسم المجموعة";
  const input = document.createElement("input");
  input.value = group.name;
  input.maxLength = 60;
  label.append(text, input);

  const save = document.createElement("button");
  save.className = "mini-action";
  save.type = "submit";
  save.textContent = "حفظ الاسم";

  const remove = document.createElement("button");
  remove.className = "mini-action danger-action";
  remove.type = "button";
  remove.textContent = "حذف المجموعة";

  section.addEventListener("submit", async (event) => {
    event.preventDefault();
    const { error } = await supabaseClient.rpc("admin_rename_group", { target_group_id: group.id, group_name: input.value });
    if (error) {
      setMessage(message, arabicError(error, "تعذر تغيير الاسم."), true);
      return;
    }
    await renderAdminGroups();
  });

  remove.addEventListener("click", async () => {
    const count = groupMemberIds(group.id).length;
    const sure = await confirmDialog(
      `حذف مجموعة «${group.name}»؟ ${count ? `يفقد ${membersLabel(count)} أنشطة هذه المجموعة، وتبقى حساباتهم ونتائجهم وأنشطتهم الخاصة.` : "لا يوجد فيها أعضاء."}`,
      "حذف المجموعة"
    );
    if (!sure) return;

    const { error } = await supabaseClient.rpc("admin_delete_group", { target_group_id: group.id });
    if (error) {
      setMessage(message, arabicError(error, "تعذر حذف المجموعة."), true);
      return;
    }
    adminOpenGroups.delete(group.id);
    await renderAdminGroups();
  });

  section.append(label, save, remove);
  return section;
}

// ── Users tab ─────────────────────────────────────────────────────
/**
 * The activities of one account. `groupSources` says which of them come from its groups: those
 * are ticked and locked, because they change from the group. getAssignmentConfigs skips them, so
 * what is saved is only what the Admin gave this account itself.
 */
function renderAssignmentCheckboxes(container, assignments, groupSources = new Map()) {
  const legend = container.querySelector("legend") || document.createElement("legend");
  legend.textContent = "الأنشطة المتاحة";
  container.replaceChildren(legend);
  const own = new Set((assignments || []).filter((assignment) => assignment.direct !== false).map((assignment) => assignment.quiz_id));

  assignmentCatalog.forEach((quiz) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = quiz.id;
    const fromGroups = groupSources.get(quiz.id);
    input.checked = own.has(quiz.id) || Boolean(fromGroups);
    input.disabled = !own.has(quiz.id) && Boolean(fromGroups);
    const text = document.createElement("span");
    text.textContent = `${quiz.icon} ${quiz.title}`;
    label.append(input, text);
    if (fromGroups) {
      label.classList.toggle("is-from-group", input.disabled);
      const source = document.createElement("span");
      source.className = "assignment-source";
      source.textContent = `من مجموعة ${fromGroups.join("، ")}`;
      label.append(source);
    }
    container.append(label);
  });
}

async function renderAdminUsers() {
  const list = document.querySelector("#adminUsersList");
  if (!list.childElementCount) list.replaceChildren(createEmptyState("جاري التحميل…"));

  try {
    await loadAdminData();
  } catch {
    list.replaceChildren(createEmptyState("تعذر تحميل المستخدمين."));
    return;
  }

  fillGroupFilter("users");
  renderNewUserGroups();
  renderAdminUsersList();
}

function renderNewUserGroups() {
  const fieldset = document.querySelector("#newUserGroups");
  const legend = document.createElement("legend");
  legend.textContent = "المجموعات";
  fieldset.hidden = !adminData.groups.length;
  fieldset.replaceChildren(legend, ...adminData.groups.map((group) => {
    const label = document.createElement("label");
    label.className = "checkbox-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = group.id;
    const text = document.createElement("span");
    text.textContent = group.name;
    label.append(input, text);
    return label;
  }));
}

function renderAdminUsersList() {
  const list = document.querySelector("#adminUsersList");
  const shown = adminData.users.filter((user) => matchesAdminFilter(user, adminFilters.users));
  document.querySelector("#adminUsersCount").textContent = `${shown.length} من ${adminData.users.length}`;

  if (!shown.length) {
    list.replaceChildren(createEmptyState("لا يوجد مستخدم بهذا البحث."));
    return;
  }

  list.replaceChildren(...shown.map(createUserRow));
}

function createUserRow(user) {
  const row = document.createElement("details");
  row.className = "user-activity admin-user";
  row.dataset.userId = user.id;

  const summary = document.createElement("summary");
  const name = document.createElement("strong");
  name.textContent = `${user.avatar || "⭐"} ${user.display_name}`;
  const meta = document.createElement("span");
  meta.className = "progress-meta";
  const groups = groupsOfUser(user.id);
  const count = adminData.assignments.filter((assignment) => assignment.user_id === user.id).length;
  meta.textContent = `@${user.username} · ${user.role === "admin" ? "مدير" : "طفل"} · ${activitiesLabel(count)}`;
  summary.append(name, meta);
  if (groups.length) {
    const chips = document.createElement("span");
    chips.className = "group-chips";
    groups.forEach((group) => {
      const chip = document.createElement("span");
      chip.className = "group-chip";
      chip.textContent = group.name;
      chips.append(chip);
    });
    summary.append(chips);
  }

  const body = document.createElement("div");
  body.className = "admin-row-body";
  row.append(summary, body);

  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    buildUserBody(user, body);
  };

  row.open = adminOpenUsers.has(user.id);
  if (row.open) build();
  row.addEventListener("toggle", () => {
    if (row.open) {
      adminOpenUsers.add(user.id);
      build();
    } else {
      adminOpenUsers.delete(user.id);
    }
  });
  return row;
}

function buildUserBody(user, body) {
  const assignments = adminData.assignments.filter((assignment) => assignment.user_id === user.id);
  const message = document.createElement("p");
  message.className = "form-message compact-message";

  const groupsField = document.createElement("fieldset");
  if (adminData.groups.length) {
    const legend = document.createElement("legend");
    legend.textContent = "المجموعات";
    groupsField.append(legend);
    const inGroups = new Set(groupsOfUser(user.id).map((group) => group.id));
    adminData.groups.forEach((group) => {
      const label = document.createElement("label");
      label.className = "checkbox-row";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = inGroups.has(group.id);
      const text = document.createElement("span");
      text.textContent = group.name;
      label.append(input, text);
      groupsField.append(label);
      input.addEventListener("change", async () => {
        const enabled = input.checked;
        input.disabled = true;
        setMessage(message, "جاري الحفظ…");
        const { error } = await supabaseClient.rpc("admin_set_group_members", {
          target_group_id: group.id,
          user_ids: [user.id],
          enabled
        });
        if (error) {
          input.disabled = false;
          input.checked = !enabled;
          setMessage(message, arabicError(error, "تعذر الحفظ."), true);
          return;
        }
        await renderAdminUsers();
      });
    });
  }

  const fieldset = document.createElement("fieldset");
  renderAssignmentCheckboxes(fieldset, assignments, groupSourcesOfUser(user.id));

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
  actions.append(saveButton, passwordButton, deleteButton, adaptiveButton);

  const adaptivePanel = createAdaptivePanel(user.id, assignments);
  body.append(groupsField, fieldset, passwordReset, actions, message, adaptivePanel);

  saveButton.addEventListener("click", () => saveAssignments(user.id, fieldset, saveButton, message));
  passwordButton.addEventListener("click", () => updateUserPassword(user.id, passwordInput, message));
  deleteButton.addEventListener("click", () => deleteUserAccount(user, message));
  adaptiveButton.addEventListener("click", () => {
    adaptivePanel.hidden = !adaptivePanel.hidden;
    if (!adaptivePanel.hidden) loadAdaptiveAnalytics(user.id, adaptivePanel);
  });
}

async function createUser(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.querySelector("#createUserMessage");
  const formData = new FormData(form);
  const quizConfigs = getAssignmentConfigs(document.querySelector("#newUserAssignments"));
  const groupIds = [...document.querySelectorAll("#newUserGroups input:checked")].map((input) => input.value);

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

    for (const groupId of groupIds) {
      const { error } = await supabaseClient.rpc("admin_set_group_members", {
        target_group_id: groupId,
        user_ids: [payload.id],
        enabled: true
      });
      if (error) throw new Error("أُنشئ المستخدم لكن تعذرت إضافته إلى المجموعة.");
    }

    form.reset();
    renderAssignmentCheckboxes(document.querySelector("#newUserAssignments"), []);
    setMessage(message, "تم إنشاء المستخدم.");
    await renderAdminUsers();
  } catch (error) {
    setMessage(message, arabicError(error, error.message), true);
  }
}

function createEmptyState(message) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  return empty;
}

async function saveAssignments(userId, fieldset, button, message) {
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
    setMessage(message, arabicError(error, "تعذر حفظ الأنشطة."), true);
    return;
  }

  await renderAdminUsers();
}

function getAssignmentConfigs(container) {
  return [...container.querySelectorAll("input[type='checkbox']:checked:not(:disabled)")].map((input) => {
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
  const confirmed = await confirmDialog(`حذف حساب ${user.display_name} وكل نتائجه المحفوظة؟`, "حذف الحساب");
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
    fetchActivityIndex(),
    loadAdminData().catch(() => undefined)
  ]);
  fillGroupFilter("activity");

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
    const group = createUserActivityGroup(profile, statsByUser.get(profile.id), quizMap);
    group.adminProfile = profile;
    list.append(group);
  });
  applyAdminActivityFilter();
}

function applyAdminActivityFilter() {
  document.querySelectorAll("#adminActivityList .user-activity").forEach((group) => {
    group.hidden = !matchesAdminFilter(group.adminProfile, adminFilters.activity);
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
