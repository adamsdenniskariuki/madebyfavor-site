// Display preferences: colour mode (system/light/dark) and accent theme.
// Stored only in this browser's localStorage. The inline <head> script applies
// them before first paint; this module wires up the controls.

const root = document.documentElement;
const MODES = ["system", "light", "dark"];
const THEMES = ["ink", "forest", "ember"];
const MODE_KEY = "mbf-mode";
const THEME_KEY = "mbf-theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: preference lasts for this page view only */
  }
};

const ICONS = {
  system:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};
const LABELS = { system: "System", light: "Light", dark: "Dark" };

const modeButton = document.getElementById("mode-toggle");
const themeInputs = document.querySelectorAll('input[name="theme"]');

const nextMode = (mode) => MODES[(MODES.indexOf(mode) + 1) % MODES.length];

function currentMode() {
  const mode = root.dataset.mode;
  return MODES.includes(mode) ? mode : "system";
}

function applyMode() {
  const mode = currentMode();
  const dark = mode === "dark" || (mode === "system" && darkQuery.matches);
  root.dataset.mode = mode;
  root.dataset.scheme = dark ? "dark" : "light";

  if (modeButton) {
    modeButton.innerHTML = `${ICONS[mode]}<span class="mode-label">${LABELS[mode]}</span>`;
    modeButton.setAttribute(
      "aria-label",
      `Colour mode: ${LABELS[mode]}. Switch to ${LABELS[nextMode(mode)]}.`,
    );
    modeButton.title = `Colour mode: ${LABELS[mode]}`;
  }
}

function applyTheme() {
  const saved = root.dataset.theme;
  const theme = THEMES.includes(saved) ? saved : "ink";
  root.dataset.theme = theme;
  themeInputs.forEach((input) => {
    input.checked = input.value === theme;
  });
}

modeButton?.addEventListener("click", () => {
  const mode = nextMode(currentMode());
  root.dataset.mode = mode;
  write(MODE_KEY, mode);
  applyMode();
});

themeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    root.dataset.theme = input.value;
    write(THEME_KEY, input.value);
    applyTheme();
  });
});

darkQuery.addEventListener("change", applyMode);

// Keep preferences in sync when they change in another tab.
window.addEventListener("storage", (event) => {
  if (event.key === MODE_KEY && MODES.includes(event.newValue)) {
    root.dataset.mode = event.newValue;
    applyMode();
  }
  if (event.key === THEME_KEY && THEMES.includes(event.newValue)) {
    root.dataset.theme = event.newValue;
    applyTheme();
  }
});

if (!root.dataset.mode) root.dataset.mode = read(MODE_KEY) || "system";
if (!root.dataset.theme) root.dataset.theme = read(THEME_KEY) || "ink";
applyMode();
applyTheme();

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
