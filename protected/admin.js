"use strict";

// Elements
const adminName = document.getElementById("adminName");

const btnLogout = document.getElementById("btnLogout");
const btnRefresh = document.getElementById("btnRefresh");
const btnTheme = document.getElementById("btnTheme");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");
const nowText = document.getElementById("nowText");

const statActiveUsers = document.getElementById("statActiveUsers");
const statAlerts = document.getElementById("statAlerts");

const loadingOverlay = document.getElementById("loadingOverlay");

const modalOverlay = document.getElementById("modalOverlay");
const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");

let modalOpen = false;
let themeBusy = false;

// ---------- Loading ----------
function showLoading(text) {
  if (!loadingOverlay) return;
  const textEl = loadingOverlay.querySelector(".loading-text");
  if (textEl) textEl.textContent = text || "Procesando…";
  loadingOverlay.classList.remove("hidden");
  loadingOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function hideLoading() {
  if (!loadingOverlay) return;
  loadingOverlay.classList.add("hidden");
  loadingOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ---------- Modal ----------
function openLogoutModal() {
  modalOpen = true;
  modalOverlay.classList.remove("hidden");
  modalOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  confirmLogoutBtn.focus();
}

function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  modalOverlay.classList.add("hidden");
  modalOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

if (modalOverlay) {
  modalOverlay.addEventListener("click", (e) => {
    if (e.target.closest("[data-modal-close]")) closeModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (!modalOpen) return;
  if (e.key === "Escape") closeModal();
});

// ---------- Theme ----------
function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  if (themeIcon)
    themeIcon.textContent = mode === "dark" ? "light_mode" : "dark_mode";
  if (themeText) themeText.textContent = mode === "dark" ? "Claro" : "Oscuro";

  localStorage.setItem("admin_theme", mode);
}

function getCurrentTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function detectDefaultTheme() {
  const saved = localStorage.getItem("admin_theme");
  if (saved === "dark" || saved === "light") return saved;
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

async function switchThemeWithLoading(nextMode) {
  if (themeBusy) return;
  themeBusy = true;
  if (btnTheme) btnTheme.disabled = true;

  showLoading("Cambiando tema…");
  await new Promise((r) => requestAnimationFrame(() => r()));
  await new Promise((r) => setTimeout(r, 250));

  applyTheme(nextMode);

  await new Promise((r) => setTimeout(r, 120));
  hideLoading();

  if (btnTheme) btnTheme.disabled = false;
  themeBusy = false;
}

function initTheme() {
  const initial = detectDefaultTheme();
  showLoading("Cargando tema…");
  requestAnimationFrame(async () => {
    await new Promise((r) => setTimeout(r, 180));
    applyTheme(initial);
    await new Promise((r) => setTimeout(r, 90));
    hideLoading();
  });
}

if (btnTheme) {
  btnTheme.addEventListener("click", async () => {
    const current = getCurrentTheme();
    const next = current === "dark" ? "light" : "dark";
    await switchThemeWithLoading(next);
  });
}

// ---------- Clock ----------
function startClock() {
  if (!nowText) return;
  function tick() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    nowText.textContent = `${hh}:${mm}`;
  }
  tick();
  setInterval(tick, 15_000);
}

// ---------- Fetch session info ----------
async function loadMe() {
  try {
    const r = await fetch("/api/auth/me");
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) {
      window.location.href = "/login.html";
      return;
    }
    adminName.textContent = data.admin.email || "Admin";
  } catch {
    window.location.href = "/login.html";
  }
}

// ---------- Placeholder stats ----------
function setStatsPlaceholder() {
  statActiveUsers.textContent = "—";
  statAlerts.textContent = "—";
}

async function refreshDashboard() {
  showLoading("Actualizando…");
  try {
    await new Promise((r) => setTimeout(r, 550));
    setStatsPlaceholder();
  } finally {
    hideLoading();
  }
}

if (btnRefresh) btnRefresh.addEventListener("click", refreshDashboard);

// ---------- Actions grid / nav ----------
document.addEventListener("click", async (e) => {
  const card = e.target.closest("[data-action]");
  if (!card) return;

  const action = card.getAttribute("data-action");

  // ✅ Apariencia -> abre editor
  if (action === "appearance") {
    showLoading("Abriendo editor…");
    setTimeout(() => {
      window.location.href = "/admin/appearance";
    }, 250);
    return;
  }

  // ✅ Inventario -> abre CRUD
  if (action === "inventory") {
    showLoading("Abriendo inventario…");
    setTimeout(() => {
      window.location.href = "/admin/inventory";
    }, 250);
    return;
  }

  if (action === "locations") {
    showLoading("Abriendo puntos de venta…");
    setTimeout(() => {
      window.location.href = "/admin/locations";
    }, 250);
    return;
  }

  showLoading("Abriendo…");
  try {
    await new Promise((r) => setTimeout(r, 450));
  } finally {
    hideLoading();
  }
});

document.addEventListener("click", async (e) => {
  const nav = e.target.closest("[data-nav]");
  if (!nav) return;
  if (themeBusy) return;

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("nav-btn--active"));
  nav.classList.add("nav-btn--active");

  showLoading("Cargando…");
  try {
    await new Promise((r) => setTimeout(r, 420));
  } finally {
    hideLoading();
  }
});

// ---------- Logout ----------
if (btnLogout) btnLogout.addEventListener("click", openLogoutModal);

if (confirmLogoutBtn) {
  confirmLogoutBtn.addEventListener("click", async () => {
    closeModal();
    showLoading("Cerrando sesión…");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      hideLoading();
      window.location.href = "/login.html";
    }
  });
}

// Init
initTheme();
startClock();
setStatsPlaceholder();
loadMe();
