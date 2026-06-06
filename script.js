const kids = [
  {
    name: "Humoud",
    className: "humoud",
    avatar: "🚀",
    quizzes: [
      {
        name: "World Flags Quiz",
        icon: "🌍",
        color: "#e5f8ff",
        url: "https://ahmad9077.github.io/world-flags-quiz/"
      },
      {
        name: "Country Map Quiz",
        icon: "🗺️",
        color: "#eafff9",
        url: "https://ahmad9077.github.io/country-map-quiz/"
      },
      {
        name: "Spelling Quiz",
        icon: "🔤",
        color: "#fff2bf",
        url: "https://ahmad9077.github.io/spelling-quiz/"
      }
    ]
  },
  {
    name: "Deema",
    className: "deema",
    avatar: "🌸",
    quizzes: [
      {
        name: "Picture Reading Quiz",
        icon: "📖",
        color: "#ffece6",
        url: "https://ahmad9077.github.io/little-words-picture-quiz/"
      }
    ]
  }
];

const kidsGrid = document.querySelector("#kidsGrid");
const kidTemplate = document.querySelector("#kidTemplate");
const quizTemplate = document.querySelector("#quizTemplate");

kids.forEach((kid) => {
  const panel = kidTemplate.content.firstElementChild.cloneNode(true);
  panel.classList.add(kid.className);
  panel.querySelector(".avatar").textContent = kid.avatar;
  panel.querySelector("h2").textContent = kid.name;

  const quizList = panel.querySelector(".quiz-list");

  kid.quizzes.forEach((quiz) => {
    const tile = quizTemplate.content.firstElementChild.cloneNode(true);
    tile.href = quiz.url;
    tile.style.setProperty("--tile-color", quiz.color);
    tile.setAttribute("aria-label", `Start ${quiz.name}`);
    tile.querySelector(".quiz-icon").textContent = quiz.icon;
    tile.querySelector(".quiz-name").textContent = quiz.name;
    quizList.append(tile);
  });

  kidsGrid.append(panel);
});
