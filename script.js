const landingPath = "/Users/macserver/Documents/Codex/2026-06-06/i-have-multiple-projects-that-they/index.html";

const quizProjects = [
  {
    title: "Picture Reading Quiz",
    category: "Deema",
    badge: "Words",
    description: "Child-focused picture and word quiz with 15-question rounds, spoken words, and answer locking.",
    questions: "15 per round",
    repo: "little-words-picture-quiz",
    status: "Live",
    accent: "#2f6f5e",
    launchUrl: "https://ahmad9077.github.io/little-words-picture-quiz/",
    localUrl: "file:///Users/macserver/Documents/Codex/2026-06-03/i-want-you-to-make-a/index.html",
    projectPath: "/Users/macserver/Documents/Codex/2026-06-03/i-want-you-to-make-a",
    keywords: ["reading", "picture", "words", "kids", "daughter", "3 letters", "4 letters"]
  },
  {
    title: "World Flags Quiz",
    category: "Humoud",
    badge: "Flag",
    description: "Interactive country flag quiz with 15-question sessions and review after the round.",
    questions: "15 per round",
    repo: "world-flags-quiz",
    status: "Live",
    accent: "#2f5f8f",
    launchUrl: "https://ahmad9077.github.io/world-flags-quiz/",
    localUrl: "file:///Users/macserver/Documents/Codex/2026-05-20/you-are-running-on-my-mac-2/index.html",
    projectPath: "/Users/macserver/Documents/Codex/2026-05-20/you-are-running-on-my-mac-2",
    keywords: ["flag", "country", "countries", "geography", "map"]
  },
  {
    title: "Country Map Quiz",
    category: "Humoud",
    badge: "Map",
    description: "Country border-outline quiz using maps, neighboring countries, and multiple-choice answers.",
    questions: "15 per round",
    repo: "country-map-quiz",
    status: "Live",
    accent: "#9d3f39",
    launchUrl: "https://ahmad9077.github.io/country-map-quiz/",
    localUrl: "file:///Users/macserver/Documents/Codex/2026-05-27/i-want-to-create-a-website/index.html",
    projectPath: "/Users/macserver/Documents/Codex/2026-05-27/i-want-to-create-a-website",
    keywords: ["map", "country", "borders", "geography", "outline"]
  },
  {
    title: "Spelling Quiz",
    category: "Humoud",
    badge: "Spell",
    description: "Spelling practice quiz with missing-letter answer tiles and fresh 20-question rounds.",
    questions: "20 per round",
    repo: "spelling-quiz",
    status: "Live",
    accent: "#6f4aa8",
    launchUrl: "https://ahmad9077.github.io/spelling-quiz/",
    localUrl: "file:///Users/macserver/Documents/Spelling%20Quiz/index.html",
    projectPath: "/Users/macserver/Documents/Spelling Quiz",
    keywords: ["spelling", "letters", "words", "missing letters", "humoud"]
  }
];

const state = {
  category: "All",
  search: ""
};

const grid = document.querySelector("#quizGrid");
const template = document.querySelector("#quizCardTemplate");
const tabs = document.querySelector("#categoryTabs");
const searchInput = document.querySelector("#searchInput");
const visibleCount = document.querySelector("#visibleCount");
const categoryCount = document.querySelector("#categoryCount");
const landingPathNode = document.querySelector("#landingPath");

landingPathNode.textContent = landingPath;

const preferredCategoryOrder = ["Humoud", "Deema"];
const discoveredCategories = [...new Set(quizProjects.map((project) => project.category))];
const categories = [
  "All",
  ...preferredCategoryOrder.filter((category) => discoveredCategories.includes(category)),
  ...discoveredCategories.filter((category) => !preferredCategoryOrder.includes(category))
];
categoryCount.textContent = String(categories.length - 1);

function normalized(value) {
  return value.toLowerCase().trim();
}

function projectMatches(project) {
  const categoryMatch = state.category === "All" || project.category === state.category;
  const haystack = normalized([
    project.title,
    project.category,
    project.description,
    project.repo,
    project.questions,
    ...project.keywords
  ].join(" "));
  const searchMatch = !state.search || haystack.includes(normalized(state.search));

  return categoryMatch && searchMatch;
}

function renderTabs() {
  tabs.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = "category-tab";
    button.type = "button";
    button.role = "tab";
    button.textContent = category;
    button.setAttribute("aria-selected", String(category === state.category));
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    tabs.append(button);
  });
}

function renderCards() {
  const matches = quizProjects.filter(projectMatches);
  visibleCount.textContent = String(matches.length);
  grid.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No quiz websites match this search.";
    grid.append(empty);
    return;
  }

  matches.forEach((project) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.style.setProperty("--accent", project.accent);
    card.querySelector(".media-mark").textContent = project.badge;
    card.querySelector(".category-pill").textContent = project.category;
    card.querySelector(".status-pill").textContent = project.status;
    card.querySelector("h2").textContent = project.title;
    card.querySelector(".description").textContent = project.description;
    card.querySelector(".questions").textContent = project.questions;
    card.querySelector(".repo").textContent = project.repo;

    const primaryLink = card.querySelector(".primary-link");
    primaryLink.href = project.launchUrl;
    primaryLink.setAttribute("aria-label", `Open ${project.title}`);

    const localLink = card.querySelector(".local-link");
    localLink.href = project.localUrl;
    localLink.setAttribute("aria-label", `Open local ${project.title}`);

    const pathCode = card.querySelector(".project-path");
    pathCode.textContent = project.projectPath;

    card.querySelector(".path-copy").addEventListener("click", () => {
      copyText(project.projectPath);
    });

    grid.append(card);
  });
}

function render() {
  renderTabs();
  renderCards();
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-200px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCards();
});

document.querySelector("#copyLandingPath").addEventListener("click", () => {
  copyText(landingPath);
});

render();
