/* protected/team.js */

const API = {
  puntosVenta: "/api/admin/puntosventa",
  users: "/api/admin/usercocina",
};

const els = {
  tbody: document.getElementById("tbody"),
  emptyState: document.getElementById("emptyState"),
  statusText: document.getElementById("statusText"),
  btnOpenCreate: document.getElementById("btnOpenCreate"),
  btnRefresh: document.getElementById("btnRefresh"),
  searchInput: document.getElementById("searchInput"),
  filterPV: document.getElementById("filterPV"),
  sortSelect: document.getElementById("sortSelect"),

  backdrop: document.getElementById("backdrop"),

  modalForm: document.getElementById("modalForm"),
  modalFormTitle: document.getElementById("modalFormTitle"),
  userForm: document.getElementById("userForm"),
  formId: document.getElementById("formId"),
  formAdmin: document.getElementById("formAdmin"),
  formCorreo: document.getElementById("formCorreo"),

  pvSearch: document.getElementById("pvSearch"),
  formPV: document.getElementById("formPV"),

  formError: document.getElementById("formError"),

  // Create password
  createPasswordBlock: document.getElementById("createPasswordBlock"),
  passModeAuto: document.getElementById("passModeAuto"),
  passModeManual: document.getElementById("passModeManual"),
  manualPasswordFields: document.getElementById("manualPasswordFields"),
  formPassword: document.getElementById("formPassword"),
  formPassword2: document.getElementById("formPassword2"),
  btnTogglePass: document.getElementById("btnTogglePass"),
  passStrengthBar: document.getElementById("passStrengthBar"),
  passStrengthText: document.getElementById("passStrengthText"),
  passError: document.getElementById("passError"),
  autoPassHint: document.getElementById("autoPassHint"),

  // Edit extras
  editExtras: document.getElementById("editExtras"),
  btnResetPassInline: document.getElementById("btnResetPassInline"),

  editEnableManualPass: document.getElementById("editEnableManualPass"),
  editManualPasswordFields: document.getElementById("editManualPasswordFields"),
  editPassword: document.getElementById("editPassword"),
  editPassword2: document.getElementById("editPassword2"),
  editBtnTogglePass: document.getElementById("editBtnTogglePass"),
  editPassStrengthBar: document.getElementById("editPassStrengthBar"),
  editPassStrengthText: document.getElementById("editPassStrengthText"),
  editPassError: document.getElementById("editPassError"),

  btnSubmit: document.getElementById("btnSubmit"),

  modalConfirm: document.getElementById("modalConfirm"),
  confirmCorreo: document.getElementById("confirmCorreo"),
  confirmError: document.getElementById("confirmError"),
  btnConfirmDelete: document.getElementById("btnConfirmDelete"),

  modalPassword: document.getElementById("modalPassword"),
  generatedPassword: document.getElementById("generatedPassword"),
  btnCopyPass: document.getElementById("btnCopyPass"),

  loadingOverlay: document.getElementById("loadingOverlay"),

  modalReset: document.getElementById("modalReset"),
  resetCorreo: document.getElementById("resetCorreo"),
  resetError: document.getElementById("resetError"),
  btnConfirmReset: document.getElementById("btnConfirmReset"),
};

let puntosVenta = [];
let users = [];
let pendingDelete = null;
let pendingReset = null;

// ---------- Loading ----------
function showLoading(text) {
  if (!els.loadingOverlay) return;
  const textEl = els.loadingOverlay.querySelector(".loading-text");
  if (textEl) textEl.textContent = text || "Procesando…";
  els.loadingOverlay.classList.remove("hidden");
  els.loadingOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function hideLoading() {
  if (!els.loadingOverlay) return;
  els.loadingOverlay.classList.add("hidden");
  els.loadingOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ---------- Modales ----------
function showBackdrop() {
  els.backdrop?.classList.remove("hidden");
}
function hideBackdrop() {
  els.backdrop?.classList.add("hidden");
}
function openModal(modalEl) {
  showBackdrop();
  modalEl.classList.remove("hidden");
}
function closeModal(modalEl) {
  modalEl.classList.add("hidden");
  const anyOpen = [els.modalForm, els.modalConfirm, els.modalPassword, els.modalReset]
    .filter(Boolean)
    .some((m) => !m.classList.contains("hidden"));
  if (!anyOpen) hideBackdrop();
}

function setError(el, msg) {
  if (!el) return;
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Respuesta inválida del servidor" };
  }

  if (!res.ok) throw new Error(data?.error || `Error HTTP ${res.status}`);
  return data;
}

// ---------- Password validation (front) ----------
function normalizeEmailParts(correo) {
  const c = (correo || "").toLowerCase().trim();
  const [user, domain] = c.split("@");
  const domainMain = (domain || "").split(".")[0] || "";
  return { c, user: user || "", domainMain };
}

function hasSequentialPattern(pw) {
  const s = pw.toLowerCase();
  const seqs = ["abcdefghijklmnopqrstuvwxyz", "0123456789"];
  for (const seq of seqs) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const sub = seq.slice(i, i + 4);
      if (s.includes(sub)) return true;
    }
  }
  return false;
}

function hasRepeatedChars(pw) {
  return /(.)\1\1\1/.test(pw);
}

function isCommonPassword(pw) {
  const common = new Set([
    "123456","12345678","123456789","password","qwerty","abc123","111111",
    "123123","admin","letmein","iloveyou","000000","passw0rd","password1",
  ]);
  return common.has(pw.toLowerCase());
}

function validatePasswordStrong(pw, correo) {
  if (!pw) return "La contraseña es obligatoria.";
  if (pw.length < 12) return "La contraseña debe tener mínimo 12 caracteres.";
  if (pw.length > 72) return "La contraseña no puede superar 72 caracteres (límite seguro por bcrypt).";
  if (/\s/.test(pw)) return "La contraseña no puede contener espacios.";

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);

  if (!(hasLower && hasUpper && hasDigit && hasSym)) {
    return "Debe incluir mayúscula, minúscula, número y símbolo.";
  }

  if (isCommonPassword(pw)) return "Esa contraseña es demasiado común. Elige otra.";
  if (hasSequentialPattern(pw)) return "Evita secuencias obvias (abcd, 1234, etc.).";
  if (hasRepeatedChars(pw)) return "Evita repetir el mismo carácter muchas veces (ej: aaaa).";

  const { c, user, domainMain } = normalizeEmailParts(correo);
  const s = pw.toLowerCase();

  if (c && s.includes(c)) return "No uses el correo completo dentro de la contraseña.";
  if (user && user.length >= 4 && s.includes(user)) return "No incluyas el usuario del correo dentro de la contraseña.";
  if (domainMain && domainMain.length >= 4 && s.includes(domainMain)) return "No incluyas el dominio del correo dentro de la contraseña.";

  return null;
}

function scorePassword(pw, correo) {
  if (!pw) return { score: 0, label: "Vacía" };

  let score = 0;
  if (pw.length >= 12) score += 25;
  if (pw.length >= 16) score += 10;

  if (/[a-z]/.test(pw)) score += 15;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 15;

  if (/\s/.test(pw)) score -= 30;
  if (isCommonPassword(pw)) score = 0;
  if (hasSequentialPattern(pw)) score -= 15;
  if (hasRepeatedChars(pw)) score -= 10;

  const err = validatePasswordStrong(pw, correo);
  if (err) score = Math.min(score, 55);

  score = Math.max(0, Math.min(100, score));
  const label = score >= 85 ? "Muy fuerte" : score >= 70 ? "Fuerte" : score >= 45 ? "Media" : "Débil";
  return { score, label };
}

function updateStrengthUI({ pwEl, correoEl, barEl, textEl }) {
  if (!barEl || !textEl) return;
  const correo = correoEl?.value || "";
  const pw = pwEl?.value || "";
  const { score, label } = scorePassword(pw, correo);

  barEl.style.width = `${score}%`;
  textEl.textContent = pw
    ? `Fortaleza: ${label} (${score}/100)`
    : "Escribe una contraseña para ver su fortaleza.";
}

// ---------- PV helpers (con filtro) ----------
function fillPVSelect(selectEl, selectedValue = "", query = "") {
  const q = (query || "").trim().toLowerCase();
  const list = !q
    ? [...puntosVenta]
    : puntosVenta.filter((b) => String(b).toLowerCase().includes(q));

  selectEl.innerHTML = "";

  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Selecciona un local…";
  opt0.disabled = true;
  opt0.selected = !selectedValue;
  selectEl.appendChild(opt0);

  if (selectedValue && !list.includes(selectedValue)) {
    const keep = document.createElement("option");
    keep.value = selectedValue;
    keep.textContent = `${selectedValue} (seleccionado)`;
    keep.selected = true;
    selectEl.appendChild(keep);
  }

  for (const barrio of list) {
    const o = document.createElement("option");
    o.value = barrio;
    o.textContent = barrio;
    if (selectedValue && barrio === selectedValue) o.selected = true;
    selectEl.appendChild(o);
  }

  if (!selectedValue && q && list.length === 1) {
    selectEl.value = list[0];
  }
}

function fillPVFilter() {
  const current = els.filterPV.value;
  els.filterPV.innerHTML = `<option value="">Todos</option>`;
  puntosVenta.forEach((barrio) => {
    const o = document.createElement("option");
    o.value = barrio;
    o.textContent = barrio;
    if (current && barrio === current) o.selected = true;
    els.filterPV.appendChild(o);
  });
}

// ---------- Render ----------
function getFilteredUsers() {
  const q = els.searchInput.value.trim().toLowerCase();
  const pv = els.filterPV.value;
  let list = [...users];

  if (pv) list = list.filter((u) => u.PuntoVenta === pv);

  if (q) {
    list = list.filter((u) => {
      return (
        String(u.id).includes(q) ||
        (u.administrador || "").toLowerCase().includes(q) ||
        (u.correo || "").toLowerCase().includes(q) ||
        (u.PuntoVenta || "").toLowerCase().includes(q)
      );
    });
  }

  const sort = els.sortSelect.value;
  if (sort === "new") list.sort((a, b) => Number(b.id) - Number(a.id));
  if (sort === "old") list.sort((a, b) => Number(a.id) - Number(b.id));
  if (sort === "correo") list.sort((a, b) => (a.correo || "").localeCompare(b.correo || "", "es"));
  if (sort === "pv") list.sort((a, b) => (a.PuntoVenta || "").localeCompare(b.PuntoVenta || "", "es"));

  return list;
}

function render() {
  const list = getFilteredUsers();

  els.tbody.innerHTML = "";
  els.emptyState.classList.toggle("hidden", list.length !== 0);

  els.statusText.textContent = `Usuarios: ${users.length} • Mostrando: ${list.length} • Locales: ${puntosVenta.length}`;

  for (const u of list) {
    const tr = document.createElement("tr");
    tr.className = "text-sm";

    tr.innerHTML = `
      <td class="px-4 py-3 text-slate-600">${escapeHtml(u.id)}</td>
      <td class="px-4 py-3">${escapeHtml(u.administrador)}</td>
      <td class="px-4 py-3">${escapeHtml(u.correo)}</td>
      <td class="px-4 py-3">
        <span class="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
          ${escapeHtml(u.PuntoVenta)}
        </span>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center justify-end gap-2">
          <button data-action="edit" data-id="${escapeHtml(u.id)}"
            class="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50">
            Editar
          </button>
          <button data-action="reset" data-id="${escapeHtml(u.id)}"
            class="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50">
            Reset pass
          </button>
          <button data-action="delete" data-id="${escapeHtml(u.id)}"
            class="px-3 py-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700">
            Eliminar
          </button>
        </div>
      </td>
    `;

    els.tbody.appendChild(tr);
  }
}

// ---------- API ----------
async function loadAll() {
  showLoading("Cargando usuarios y locales…");
  try {
    const [pvRes, usersRes] = await Promise.all([
      fetchJSON(API.puntosVenta),
      fetchJSON(API.users),
    ]);

    puntosVenta = pvRes?.barrios || [];
    users = usersRes?.users || [];

    fillPVSelect(els.formPV, "", els.pvSearch?.value || "");
    fillPVFilter();

    render();
  } finally {
    hideLoading();
  }
}

async function createUser(payload) {
  return fetchJSON(API.users, { method: "POST", body: JSON.stringify(payload) });
}
async function updateUser(id, payload) {
  return fetchJSON(`${API.users}/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}
async function deleteUser(id) {
  return fetchJSON(`${API.users}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
async function resetPassword(id) {
  return fetchJSON(`${API.users}/${encodeURIComponent(id)}/reset-password`, { method: "POST" });
}

// ---------- Modal opens ----------
function resetCreatePassUI() {
  setError(els.passError, "");
  els.manualPasswordFields?.classList.add("hidden");
  els.autoPassHint?.classList.remove("hidden");
  if (els.passModeAuto) els.passModeAuto.checked = true;
  if (els.passModeManual) els.passModeManual.checked = false;
  if (els.formPassword) els.formPassword.value = "";
  if (els.formPassword2) els.formPassword2.value = "";
  updateStrengthUI({
    pwEl: els.formPassword,
    correoEl: els.formCorreo,
    barEl: els.passStrengthBar,
    textEl: els.passStrengthText,
  });
}

function setCreatePassModeUI() {
  const manual = !!els.passModeManual?.checked;
  els.manualPasswordFields?.classList.toggle("hidden", !manual);
  els.autoPassHint?.classList.toggle("hidden", manual);
  setError(els.passError, "");
  updateStrengthUI({
    pwEl: els.formPassword,
    correoEl: els.formCorreo,
    barEl: els.passStrengthBar,
    textEl: els.passStrengthText,
  });
}

function resetEditPassUI() {
  setError(els.editPassError, "");
  if (els.editEnableManualPass) els.editEnableManualPass.checked = false;
  els.editManualPasswordFields?.classList.add("hidden");
  if (els.editPassword) els.editPassword.value = "";
  if (els.editPassword2) els.editPassword2.value = "";
  updateStrengthUI({
    pwEl: els.editPassword,
    correoEl: els.formCorreo,
    barEl: els.editPassStrengthBar,
    textEl: els.editPassStrengthText,
  });
}

function toggleEditManualUI() {
  const on = !!els.editEnableManualPass?.checked;
  els.editManualPasswordFields?.classList.toggle("hidden", !on);
  setError(els.editPassError, "");
  updateStrengthUI({
    pwEl: els.editPassword,
    correoEl: els.formCorreo,
    barEl: els.editPassStrengthBar,
    textEl: els.editPassStrengthText,
  });
}

function openCreateModal() {
  setError(els.formError, "");
  els.modalFormTitle.textContent = "Crear usuario";
  els.formId.value = "";
  els.formAdmin.value = "";
  els.formCorreo.value = "";

  if (els.pvSearch) els.pvSearch.value = "";
  fillPVSelect(els.formPV, "", "");

  // Mostrar bloque de creación, ocultar edición
  els.createPasswordBlock?.classList.remove("hidden");
  els.editExtras?.classList.add("hidden");
  resetCreatePassUI();
  resetEditPassUI();

  openModal(els.modalForm);
  setTimeout(() => els.pvSearch?.focus(), 0);
}

function openEditModal(user) {
  setError(els.formError, "");
  els.modalFormTitle.textContent = `Editar usuario #${user.id}`;
  els.formId.value = user.id;
  els.formAdmin.value = user.administrador || "";
  els.formCorreo.value = user.correo || "";

  if (els.pvSearch) els.pvSearch.value = "";
  fillPVSelect(els.formPV, user.PuntoVenta || "", "");

  // Ocultar bloque de creación, mostrar edición
  els.createPasswordBlock?.classList.add("hidden");
  els.editExtras?.classList.remove("hidden");
  resetCreatePassUI();
  resetEditPassUI();

  openModal(els.modalForm);
  setTimeout(() => els.formAdmin?.focus(), 0);
}

function openDeleteModal(user) {
  pendingDelete = user;
  setError(els.confirmError, "");
  els.confirmCorreo.textContent = user.correo;
  openModal(els.modalConfirm);
}

function openResetModal(user) {
  pendingReset = user;
  setError(els.resetError, "");
  els.resetCorreo.textContent = user.correo;
  openModal(els.modalReset);
}

function openPasswordModal(password) {
  els.generatedPassword.textContent = password;
  openModal(els.modalPassword);
}

// ---------- Click handlers ----------
document.addEventListener("click", (e) => {
  const closeBtn = e.target.closest("[data-close]");
  if (closeBtn) {
    const id = closeBtn.getAttribute("data-close");
    if (id === "modalForm") closeModal(els.modalForm);
    if (id === "modalConfirm") closeModal(els.modalConfirm);
    if (id === "modalPassword") closeModal(els.modalPassword);
    if (id === "modalReset") closeModal(els.modalReset);
  }

  const actionBtn = e.target.closest("button[data-action]");
  if (actionBtn) {
    const action = actionBtn.getAttribute("data-action");
    const id = actionBtn.getAttribute("data-id");
    const user = users.find((u) => String(u.id) === String(id));
    if (!user) return;

    if (action === "edit") openEditModal(user);
    if (action === "delete") openDeleteModal(user);
    if (action === "reset") openResetModal(user);
  }
});

// ---------- Top actions ----------
els.btnOpenCreate.addEventListener("click", openCreateModal);
els.btnRefresh.addEventListener("click", () => loadAll().catch((e) => alert(e.message)));

// ---------- Filters ----------
els.searchInput.addEventListener("input", render);
els.filterPV.addEventListener("change", render);
els.sortSelect.addEventListener("change", render);

// ✅ Buscador de locales dentro del modal
if (els.pvSearch) {
  els.pvSearch.addEventListener("input", () => {
    const currentSelected = els.formPV.value || "";
    fillPVSelect(els.formPV, currentSelected, els.pvSearch.value);
  });

  els.pvSearch.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (els.formPV && els.formPV.options.length > 1) {
      els.formPV.selectedIndex = Math.min(1, els.formPV.options.length - 1);
      els.formPV.focus();
    }
  });
}

// ---------- Create password UI ----------
if (els.passModeAuto) els.passModeAuto.addEventListener("change", setCreatePassModeUI);
if (els.passModeManual) els.passModeManual.addEventListener("change", setCreatePassModeUI);

if (els.formPassword) {
  els.formPassword.addEventListener("input", () => {
    updateStrengthUI({
      pwEl: els.formPassword,
      correoEl: els.formCorreo,
      barEl: els.passStrengthBar,
      textEl: els.passStrengthText,
    });

    if (els.passModeManual?.checked) {
      const err = validatePasswordStrong(els.formPassword.value, els.formCorreo.value);
      setError(els.passError, err || "");
    }
  });
}

if (els.btnTogglePass) {
  els.btnTogglePass.addEventListener("click", () => {
    const input = els.formPassword;
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    els.btnTogglePass.textContent = input.type === "password" ? "Ver" : "Ocultar";
  });
}

// ---------- Edit manual password UI ----------
if (els.editEnableManualPass) els.editEnableManualPass.addEventListener("change", toggleEditManualUI);

if (els.editPassword) {
  els.editPassword.addEventListener("input", () => {
    updateStrengthUI({
      pwEl: els.editPassword,
      correoEl: els.formCorreo,
      barEl: els.editPassStrengthBar,
      textEl: els.editPassStrengthText,
    });

    if (els.editEnableManualPass?.checked) {
      const err = validatePasswordStrong(els.editPassword.value, els.formCorreo.value);
      setError(els.editPassError, err || "");
    }
  });
}

if (els.editBtnTogglePass) {
  els.editBtnTogglePass.addEventListener("click", () => {
    const input = els.editPassword;
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
    els.editBtnTogglePass.textContent = input.type === "password" ? "Ver" : "Ocultar";
  });
}

// ---------- Submit create/edit ----------
els.userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError(els.formError, "");
  setError(els.passError, "");
  setError(els.editPassError, "");

  const id = els.formId.value.trim();
  const administrador = els.formAdmin.value.trim();
  const correo = els.formCorreo.value.trim();
  const PuntoVenta = els.formPV.value;

  if (!administrador || !correo || !PuntoVenta) {
    setError(els.formError, "Completa todos los campos.");
    return;
  }

  try {
    els.btnSubmit.disabled = true;
    els.btnSubmit.classList.add("opacity-70");

    // ---------- CREAR ----------
    if (!id) {
      const payload = { administrador, correo, PuntoVenta };

      if (els.passModeManual?.checked) {
        const pw = els.formPassword.value || "";
        const pw2 = els.formPassword2.value || "";

        const err = validatePasswordStrong(pw, correo);
        if (err) {
          setError(els.passError, err);
          return;
        }
        if (pw !== pw2) {
          setError(els.passError, "Las contraseñas no coinciden.");
          return;
        }

        payload.password = pw;
        showLoading("Creando usuario con contraseña manual…");
      } else {
        showLoading("Creando usuario y generando contraseña…");
      }

      const r = await createUser(payload);
      closeModal(els.modalForm);

      await loadAll();
      hideLoading();

      if (r.passwordPlain) openPasswordModal(r.passwordPlain);
      return;
    }

    // ---------- EDITAR ----------
    // Si el admin activó cambio manual
    const wantsManual = !!els.editEnableManualPass?.checked;
    const payload = { administrador, correo, PuntoVenta };

    if (wantsManual) {
      const pw = els.editPassword.value || "";
      const pw2 = els.editPassword2.value || "";

      const err = validatePasswordStrong(pw, correo);
      if (err) {
        setError(els.editPassError, err);
        return;
      }
      if (pw !== pw2) {
        setError(els.editPassError, "Las contraseñas no coinciden.");
        return;
      }

      payload.password = pw; // ✅ requiere soporte en backend (PUT)
      showLoading("Guardando cambios y actualizando contraseña…");
    } else {
      showLoading("Guardando cambios…");
    }

    await updateUser(id, payload);
    closeModal(els.modalForm);

    await loadAll();
  } catch (err) {
    setError(els.formError, err.message);
  } finally {
    hideLoading();
    els.btnSubmit.disabled = false;
    els.btnSubmit.classList.remove("opacity-70");
  }
});

// ---------- Delete ----------
els.btnConfirmDelete.addEventListener("click", async () => {
  if (!pendingDelete) return;
  setError(els.confirmError, "");

  try {
    els.btnConfirmDelete.disabled = true;
    els.btnConfirmDelete.classList.add("opacity-70");

    showLoading("Eliminando usuario…");
    await deleteUser(pendingDelete.id);
    closeModal(els.modalConfirm);
    pendingDelete = null;

    await loadAll();
  } catch (err) {
    setError(els.confirmError, err.message);
  } finally {
    hideLoading();
    els.btnConfirmDelete.disabled = false;
    els.btnConfirmDelete.classList.remove("opacity-70");
  }
});

// ---------- Reset password ----------
els.btnResetPassInline.addEventListener("click", () => {
  const id = els.formId.value.trim();
  if (!id) return;
  const user = users.find((u) => String(u.id) === String(id));
  if (user) openResetModal(user);
});

els.btnConfirmReset.addEventListener("click", async () => {
  if (!pendingReset) return;
  setError(els.resetError, "");

  try {
    els.btnConfirmReset.disabled = true;
    els.btnConfirmReset.classList.add("opacity-70");

    showLoading("Generando nueva contraseña…");
    const r = await resetPassword(pendingReset.id);

    closeModal(els.modalReset);
    closeModal(els.modalForm);
    pendingReset = null;

    await loadAll();
    openPasswordModal(r.passwordPlain);
  } catch (err) {
    setError(els.resetError, err.message);
  } finally {
    hideLoading();
    els.btnConfirmReset.disabled = false;
    els.btnConfirmReset.classList.remove("opacity-70");
  }
});

// ---------- Copy password ----------
els.btnCopyPass.addEventListener("click", async () => {
  const text = els.generatedPassword.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    els.btnCopyPass.textContent = "Copiado ✔";
    setTimeout(() => (els.btnCopyPass.textContent = "Copiar"), 1200);
  } catch {
    alert("No se pudo copiar. Copia manualmente.");
  }
});

// ---------- Init ----------
loadAll().catch((e) => {
  els.statusText.textContent = "Error cargando datos.";
  alert(e.message);
});
