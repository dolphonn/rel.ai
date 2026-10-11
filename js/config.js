(function () {
  "use strict";
  window.RAI = window.RAI || {};

  RAI.config = {
    // localStorage keys
    STORAGE_KEY: "rel.ai.board.v1",
    THEME_KEY: "rel.ai.theme",

    // Default board shape (used on first run and for the reset action)
    DEFAULT_COLUMNS: [
      { title: "To Do", done: false },
      { title: "In Progress", done: false },
      { title: "Done", done: true }
    ],

    // Label palette offered when creating a label (name + colour)
    LABEL_COLORS: [
      { name: "Red", value: "#ff5f57" },
      { name: "Orange", value: "#febc2e" },
      { name: "Green", value: "#28c840" },
      { name: "Blue", value: "#0a84ff" },
      { name: "Purple", value: "#bf5af2" },
      { name: "Pink", value: "#ff375f" }
    ]
  };
})();