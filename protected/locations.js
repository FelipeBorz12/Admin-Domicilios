"use strict";

const API = {
  list: "/api/admin/pv",
  meta: "/api/admin/pv/meta",
  create: "/api/admin/pv",
  update: (id) => `/api/admin/pv/${id}`,
  remove: (id) => `/api/admin/pv/${id}`,

  sales: (id, from, to) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return `/api/admin/pv/${id}/sales?` + qs.toString();
  },

  uploadImage: "/api/admin/upload-image",
  deleteImage: "/api/admin/delete-image",
};

const FALLBACK_IMG = "/img/mensaje-error.png";
const FILTERS_KEY = "tq_pv_last_filters_v1";

function q(id) {
  return document.getElementById(id);
}
function escapeHtml(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

async function apiJSON(url, opts = {}) {
  const o = { ...opts };
  o.headers = { ...(o.headers || {}), Accept: "application/json" };

  if (o.body && typeof o.body === "object" && !(o.body instanceof FormData)) {
    o.headers["Content-Type"] = "application/json";
    o.body = JSON.stringify(o.body);
  }

  const r = await fetch(url, o);
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await r.json().catch(() => ({}))
    : { ok: false, error: await r.text().catch(() => "") };

  if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

function showLoading(text) {
  const el = q("loadingOverlay");
  if (!el) return;
  const t = el.querySelector(".loading-text");
  if (t) t.textContent = text || "Procesando…";
  el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function hideLoading() {
  const el = q("loadingOverlay");
  if (!el) return;
  el.classList.add("hidden");
  document.body.style.overflow = "";
}

// ---------- Modal ----------
const els = {
  uiModal: q("uiModal"),
  uiModalIconWrap: q("uiModalIconWrap"),
  uiModalIcon: q("uiModalIcon"),
  uiModalTitle: q("uiModalTitle"),
  uiModalDesc: q("uiModalDesc"),
  uiModalBody: q("uiModalBody"),
  uiModalActions: q("uiModalActions"),

  depChips: q("depChips"),
  depHint: q("depHint"),
  countText: q("countText"),

  qSearch: q("qSearch"),
  qDep: q("qDep"),
  qMuni: q("qMuni"),

  btnReset: q("btnReset"),
  btnReload: q("btnReload"),
  btnAddPV: q("btnAddPV"),

  pvList: q("pvList"),
  listCount: q("listCount"),

  editorWrap: q("editorWrap"),
  selectedMeta: q("selectedMeta"),
  dirtyBadge: q("dirtyBadge"),

  btnSaveSelected: q("btnSaveSelected"),
  btnDeleteSelected: q("btnDeleteSelected"),
};

function hasModalUI() {
  return !!(
    els.uiModal &&
    els.uiModalTitle &&
    els.uiModalDesc &&
    els.uiModalActions &&
    els.uiModalIconWrap &&
    els.uiModalIcon &&
    els.uiModalBody
  );
}

function openModal({
  icon = "info",
  tone = "info",
  title = "",
  desc = "",
  bodyHTML = "",
  actions = [],
}) {
  if (!hasModalUI()) return;

  els.uiModalIcon.textContent = icon;
  els.uiModalTitle.textContent = title;
  els.uiModalDesc.innerHTML = desc
    ? escapeHtml(desc).replace(/\n/g, "<br/>")
    : "";
  els.uiModalBody.innerHTML = bodyHTML || "";
  els.uiModalActions.innerHTML = "";

  const wrap = els.uiModalIconWrap;
  wrap.className = "mt-0.5 h-10 w-10 rounded-xl border grid place-items-center";

  if (tone === "danger") {
    wrap.classList.add(
      "bg-rose-50",
      "border-rose-100",
      "dark:bg-rose-900/25",
      "dark:border-rose-900/40"
    );
    els.uiModalIcon.className =
      "material-symbols-outlined text-[22px] text-rose-600 dark:text-rose-300";
  } else if (tone === "success") {
    wrap.classList.add(
      "bg-emerald-50",
      "border-emerald-100",
      "dark:bg-emerald-900/25",
      "dark:border-emerald-900/40"
    );
    els.uiModalIcon.className =
      "material-symbols-outlined text-[22px] text-emerald-600 dark:text-emerald-300";
  } else {
    wrap.classList.add(
      "bg-slate-100",
      "border-slate-200",
      "dark:bg-slate-800",
      "dark:border-slate-700"
    );
    els.uiModalIcon.className =
      "material-symbols-outlined text-[22px] text-slate-700 dark:text-slate-200";
  }

  actions.forEach((a) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = a.label || "Aceptar";
    btn.className =
      "rounded-full px-5 py-2.5 text-sm font-black transition border";

    if (a.variant === "danger") {
      btn.classList.add(
        "bg-rose-600",
        "text-white",
        "border-rose-600",
        "hover:bg-rose-700"
      );
    } else if (a.variant === "primary") {
      btn.style.background = "var(--primary)";
      btn.style.color = "#fff";
      btn.classList.add("border-transparent");
      btn.addEventListener(
        "mouseenter",
        () => (btn.style.filter = "brightness(1.05)")
      );
      btn.addEventListener("mouseleave", () => (btn.style.filter = ""));
    } else {
      btn.classList.add(
        "bg-slate-100",
        "text-slate-900",
        "border-slate-200",
        "hover:opacity-90",
        "dark:bg-slate-800",
        "dark:text-slate-100",
        "dark:border-slate-700"
      );
    }

    btn.addEventListener("click", async () => {
      if (a.onClick) await a.onClick();
    });
    els.uiModalActions.appendChild(btn);
  });

  els.uiModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  els.uiModal?.classList?.add?.("hidden");
  document.body.style.overflow = "";
}

function modalAlert({ title, desc, tone = "info", icon = "info" }) {
  openModal({
    title,
    desc,
    tone,
    icon,
    actions: [
      {
        label: "Aceptar",
        variant: "primary",
        onClick: async () => closeModal(),
      },
    ],
  });
}

function modalConfirm({
  title,
  desc,
  tone = "danger",
  icon = "warning",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}) {
  return new Promise((resolve) => {
    openModal({
      title,
      desc,
      tone,
      icon,
      actions: [
        {
          label: cancelText,
          variant: "default",
          onClick: async () => {
            closeModal();
            resolve(false);
          },
        },
        {
          label: confirmText,
          variant: tone === "danger" ? "danger" : "primary",
          onClick: async () => {
            closeModal();
            resolve(true);
          },
        },
      ],
    });
  });
}

function modalErrorFriendly(err, ctx) {
  console.error("[pv][error]", ctx || "", err);
  modalAlert({
    tone: "danger",
    icon: "error",
    title: "Ocurrió un problema",
    desc: err?.message
      ? String(err.message)
      : "No pudimos completar la acción.",
  });
}

document.addEventListener("keydown", (e) => {
  if (!els.uiModal) return;
  if (!els.uiModal.classList.contains("hidden") && e.key === "Escape")
    closeModal();
});
els.uiModal?.addEventListener("click", (e) => {
  if (e.target.closest("[data-ui-close]")) closeModal();
});

function modalForm({
  title = "Formulario",
  desc = "",
  icon = "edit",
  tone = "info",
  confirmText = "Guardar",
  cancelText = "Cancelar",
  fields = [],
}) {
  return new Promise((resolve) => {
    openModal({
      title,
      desc,
      icon,
      tone,
      bodyHTML: `<div id="modalFormMount" class="grid gap-3"></div>`,
      actions: [
        {
          label: cancelText,
          variant: "default",
          onClick: async () => {
            closeModal();
            resolve(null);
          },
        },
        {
          label: confirmText,
          variant: "primary",
          onClick: async () => {
            for (const f of fields) {
              const el = document.querySelector(
                `[data-mf="${CSS.escape(f.name)}"]`
              );
              if (!el) continue;
              const val =
                el.type === "checkbox"
                  ? el.checked
                    ? "1"
                    : ""
                  : String(el.value ?? "").trim();
              if (f.required && !val) {
                modalAlert({
                  tone: "danger",
                  icon: "error",
                  title: "Faltan datos",
                  desc: `El campo "${f.label || f.name}" es obligatorio.`,
                });
                return;
              }
            }
            const out = {};
            for (const f of fields) {
              const el = document.querySelector(
                `[data-mf="${CSS.escape(f.name)}"]`
              );
              if (!el) continue;
              out[f.name] = el.type === "checkbox" ? !!el.checked : el.value;
            }
            closeModal();
            resolve(out);
          },
        },
      ],
    });

    const mount = document.getElementById("modalFormMount");
    if (!mount) return;

    fields.forEach((f) => {
      const lab = document.createElement("label");
      lab.className = "field";

      const t = document.createElement("span");
      t.className = "field-label";
      t.textContent = f.label || f.name;
      lab.appendChild(t);

      let input;
      if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.className = "field-textarea";
        input.rows = Number(f.rows || 4);
        input.value = String(f.value ?? "");
        if (f.placeholder) input.placeholder = f.placeholder;
      } else if (f.type === "select") {
        input = document.createElement("select");
        input.className = "field-select";
        (f.options || []).forEach((opt) => {
          const o = document.createElement("option");
          o.value = String(opt.value);
          o.textContent = opt.label;
          if (String(f.value ?? "") === String(opt.value)) o.selected = true;
          input.appendChild(o);
        });
      } else if (f.type === "checkbox") {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!f.value;
      } else {
        input = document.createElement("input");
        input.className = "field-input";
        input.type = f.type || "text";
        input.value = String(f.value ?? "");
        if (f.placeholder) input.placeholder = f.placeholder;
      }

      input.dataset.mf = f.name;
      lab.appendChild(input);

      if (f.hint) {
        const hint = document.createElement("span");
        hint.className = "field-hint";
        hint.innerHTML = String(f.hint);
        lab.appendChild(hint);
      }

      mount.appendChild(lab);
    });

    const first = mount.querySelector("input,textarea,select");
    if (first) setTimeout(() => first.focus(), 0);
  });
}

// ---------- STATE ----------
const state = (window.__PV_STATE__ = window.__PV_STATE__ || {
  items: [],
  meta: { departamentos: [], municipiosByDepartamento: {} },

  selectedDep: "all",
  selectedPV: null,

  draftById: new Map(),
  dirtyIds: new Set(),
});

function setDirtyBadge() {
  els.dirtyBadge?.classList?.toggle?.("hidden", !(state.dirtyIds.size > 0));
}

function normalizePV(r) {
  return {
    id: Number(r.id),
    Departamento: String(r.Departamento ?? "").trim(),
    Municipio: String(r.Municipio ?? "").trim(),
    Direccion: String(r.Direccion ?? "").trim(),
    Barrio: String(r.Barrio ?? "...").trim(),
    Latitud: Number(r.Latitud ?? 0),
    Longitud: Number(r.Longitud ?? 0),
    num_whatsapp: r.num_whatsapp == null ? "" : String(r.num_whatsapp),
    URL_image: r.URL_image == null ? "" : String(r.URL_image),
  };
}

function getEffectivePV(id) {
  const key = Number(id);
  if (state.draftById.has(key)) return state.draftById.get(key);
  return state.items.find((x) => Number(x.id) === key) || null;
}

function setDraft(id, nextObj) {
  const key = Number(id);
  state.draftById.set(key, nextObj);
  state.dirtyIds.add(key);
  setDirtyBadge();
  renderChips();
  renderList();
}

function clearDraft(id) {
  const key = Number(id);
  state.draftById.delete(key);
  state.dirtyIds.delete(key);
  setDirtyBadge();
  renderChips();
  renderList();
}

// ---------- FILTERS ----------
function getFilters() {
  const search = String(els.qSearch?.value || "").trim().toLowerCase();
  const dep = String(els.qDep?.value || "all");
  const muni = String(els.qMuni?.value || "all");
  return { search, dep, muni };
}

function filtered() {
  const { search, dep, muni } = getFilters();
  return state.items
    .filter((x) => {
      if (dep !== "all" && x.Departamento !== dep) return false;
      if (muni !== "all" && x.Municipio !== muni) return false;
      if (state.selectedDep !== "all" && x.Departamento !== state.selectedDep)
        return false;

      if (search) {
        const hay =
          `${x.id} ${x.Departamento} ${x.Municipio} ${x.Barrio} ${x.Direccion}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => {
      const k1 = `${a.Departamento} ${a.Municipio} ${a.Barrio}`.toLowerCase();
      const k2 = `${b.Departamento} ${b.Municipio} ${b.Barrio}`.toLowerCase();
      return k1.localeCompare(k2, "es");
    });
}

function countsByDep() {
  const map = {};
  for (const x of state.items) {
    const k = x.Departamento || "—";
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

// ---------- Persistencia filtros ----------
function saveFilters() {
  try {
    const payload = {
      qSearch: String(els.qSearch?.value || ""),
      qDep: String(els.qDep?.value || "all"),
      qMuni: String(els.qMuni?.value || "all"),
      selectedDep: String(state.selectedDep || "all"),
    };
    localStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
  } catch {}
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (!v) return;

    if (els.qSearch) els.qSearch.value = String(v.qSearch || "");
    if (els.qDep) els.qDep.value = String(v.qDep || "all");
    if (els.qMuni) els.qMuni.value = String(v.qMuni || "all");
    state.selectedDep = String(v.selectedDep || "all");
  } catch {}
}

// ---------- RENDER ----------
function renderDropdowns() {
  if (els.qDep) {
    const cur = String(els.qDep.value || "all");
    const deps = state.meta.departamentos || [];
    els.qDep.innerHTML =
      `<option value="all">Todos</option>` +
      deps.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
    els.qDep.value = deps.includes(cur) ? cur : "all";
  }

  if (els.qMuni) {
    const dep = String(els.qDep?.value || "all");
    const cur = String(els.qMuni.value || "all");
    const list =
      dep !== "all" ? state.meta.municipiosByDepartamento?.[dep] || [] : [];

    els.qMuni.innerHTML =
      `<option value="all">Todos</option>` +
      (dep === "all"
        ? `<option value="all">Primero elige un departamento</option>`
        : list.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join(""));

    if (dep === "all") els.qMuni.value = "all";
    else els.qMuni.value = list.includes(cur) ? cur : "all";
  }
}

function renderChips() {
  if (!els.depChips) return;

  const counts = countsByDep();
  const deps = state.meta.departamentos || [];

  els.depChips.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className =
    "chip" + (state.selectedDep === "all" ? " chip--active" : "");
  allChip.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">apps</span>
    Todos
    <span class="chip-badge">${state.items.length}</span>
  `;
  allChip.addEventListener("click", () => trySwitchDep("all"));
  els.depChips.appendChild(allChip);

  for (const d of deps) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (state.selectedDep === d ? " chip--active" : "");
    chip.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">map</span>
      ${escapeHtml(d)}
      <span class="chip-badge">${counts[d] || 0}</span>
    `;
    chip.addEventListener("click", () => trySwitchDep(d));
    els.depChips.appendChild(chip);
  }

  els.depHint.textContent =
    state.selectedDep === "all"
      ? "Mostrando todos los departamentos. Usa filtros para afinar."
      : `Mostrando: ${state.selectedDep}`;

  els.countText.textContent = `${filtered().length} / ${state.items.length} locales`;
}

function renderList() {
  if (!els.pvList) return;

  const list = filtered();
  els.listCount.textContent = String(list.length);
  els.pvList.innerHTML = "";

  if (list.length === 0) {
    els.pvList.innerHTML = `<div class="text-sm text-slate-600 dark:text-slate-300">No hay locales para estos filtros.</div>`;
    return;
  }

  for (const pv of list) {
    const isSel = Number(state.selectedPV) === Number(pv.id);
    const isDirty = state.dirtyIds.has(Number(pv.id));

    const row = document.createElement("div");
    row.className = "list-item" + (isSel ? " list-item--active" : "");
    row.innerHTML = `
      <div class="min-w-0">
        <div class="mini-title truncate">${escapeHtml(pv.Barrio || "—")}</div>
        <div class="mini-muted mt-0.5">
          ID: ${pv.id} • ${escapeHtml(pv.Departamento)} • ${escapeHtml(pv.Municipio)}
          ${isDirty ? " • ✳️ Editado" : ""}
        </div>
        <div class="mini-muted mt-0.5 truncate">${escapeHtml(pv.Direccion)}</div>
      </div>
      <div class="mini-muted">${pv.num_whatsapp ? "WA" : ""}</div>
    `;
    row.addEventListener("click", () => trySelectPV(pv.id));
    els.pvList.appendChild(row);
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderEditor() {
  if (!els.editorWrap) return;

  const pv = state.selectedPV ? getEffectivePV(state.selectedPV) : null;
  if (!pv) {
    els.selectedMeta.textContent = "—";
    els.editorWrap.innerHTML = `<div class="text-sm text-slate-600 dark:text-slate-300">Selecciona un local para editarlo.</div>`;
    return;
  }

  els.selectedMeta.textContent = `ID: ${pv.id} • ${pv.Departamento} / ${pv.Municipio}`;

  const imgUrl = (pv.URL_image || "").trim() || FALLBACK_IMG;
  const gmaps = `https://www.google.com/maps?q=${encodeURIComponent(
    pv.Latitud + "," + pv.Longitud
  )}`;

  els.editorWrap.innerHTML = `
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs font-black text-slate-500 dark:text-slate-400">Local</div>
          <div class="text-sm font-black text-slate-900 dark:text-white truncate">${escapeHtml(pv.Barrio || "—")}</div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btnUploadImg" class="rounded-full px-4 py-2 text-sm font-black btn-soft border border-slate-200 dark:border-slate-700 transition" type="button">
            <span class="material-symbols-outlined text-[18px] align-[-3px]">upload</span>
            Imagen
          </button>
          <button id="btnSaveCard" class="rounded-full px-4 py-2 text-sm font-black btn-primary transition" type="button">Guardar</button>
          <button id="btnDeleteCard" class="rounded-full px-4 py-2 text-sm font-black bg-rose-600 text-white hover:bg-rose-700 transition" type="button">Eliminar</button>
        </div>
      </div>

      <div class="p-4 grid gap-4">
        <div class="flex items-start gap-3">
          <div class="img-thumb">
            <img id="pvImg" src="${escapeHtml(imgUrl)}" alt="Imagen PV">
          </div>
          <div class="min-w-0">
            <div class="text-xs font-black text-slate-500 dark:text-slate-400">Imagen (URL)</div>
            <input id="f_img" class="field-input mt-1" type="text" value="${escapeHtml(pv.URL_image || "")}" placeholder="Se llena al subir imagen" />
            <div class="field-hint mt-1">Bucket recomendado: <b>puntos_venta/pvimage</b> (recordKey: pv-id-${pv.id}).</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Departamento</span>
            <input id="f_dep" class="field-input" type="text" value="${escapeHtml(pv.Departamento)}" />
          </label>

          <label class="field">
            <span class="field-label">Municipio</span>
            <input id="f_muni" class="field-input" type="text" value="${escapeHtml(pv.Municipio)}" />
          </label>
        </div>

        <label class="field">
          <span class="field-label">Dirección</span>
          <input id="f_dir" class="field-input" type="text" value="${escapeHtml(pv.Direccion)}" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Barrio (UNIQUE)</span>
            <input id="f_barrio" class="field-input" type="text" value="${escapeHtml(pv.Barrio)}" />
            <span class="field-hint">Tu tabla tiene UNIQUE en Barrio: no se pueden repetir.</span>
          </label>

          <label class="field">
            <span class="field-label">WhatsApp</span>
            <input id="f_wa" class="field-input" type="text" inputmode="tel" value="${escapeHtml(pv.num_whatsapp || "")}" placeholder="57..." />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Latitud</span>
            <input id="f_lat" class="field-input" type="text" inputmode="decimal" value="${escapeHtml(pv.Latitud)}" placeholder="6.2442" />
          </label>
          <label class="field">
            <span class="field-label">Longitud</span>
            <input id="f_lng" class="field-input" type="text" inputmode="decimal" value="${escapeHtml(pv.Longitud)}" placeholder="-75.5812" />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <a class="rounded-full px-4 py-2 text-sm font-black btn-soft border border-slate-200 dark:border-slate-700 transition text-center"
             href="${escapeHtml(gmaps)}" target="_blank" rel="noreferrer">
            Abrir en Maps
          </a>
          <button id="btnLoadSales" class="rounded-full px-4 py-2 text-sm font-black btn-primary transition" type="button">
            Ver ventas
          </button>
        </div>

        <div id="salesWrap" class="hidden rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
          <div class="flex items-center justify-between gap-2">
            <div class="text-sm font-black text-slate-900 dark:text-white">Ventas por producto</div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-black" id="salesMeta">—</div>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <label class="field">
              <span class="field-label">Desde</span>
              <input id="salesFrom" class="field-input" type="date" />
            </label>
            <label class="field">
              <span class="field-label">Hasta</span>
              <input id="salesTo" class="field-input" type="date" />
            </label>
          </div>

          <div class="mt-3 flex gap-2">
            <button id="btnRefreshSales" class="rounded-full px-4 py-2 text-sm font-black btn-soft border border-slate-200 dark:border-slate-700 transition" type="button">
              Actualizar
            </button>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <div class="kpi">
              <div class="text-xs font-black text-slate-500 dark:text-slate-400">Unidades</div>
              <div id="kpiQty" class="text-lg font-black text-slate-900 dark:text-white">—</div>
            </div>
            <div class="kpi">
              <div class="text-xs font-black text-slate-500 dark:text-slate-400">Ingresos</div>
              <div id="kpiRevenue" class="text-lg font-black text-slate-900 dark:text-white">—</div>
            </div>
          </div>

          <div class="mt-3 text-xs text-slate-500 dark:text-slate-400 font-black" id="salesNote"></div>

          <div class="mt-3 overflow-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-slate-500 dark:text-slate-400">
                  <th class="py-2 pr-2">Producto</th>
                  <th class="py-2 pr-2">Cant</th>
                  <th class="py-2 pr-2">$</th>
                </tr>
              </thead>
              <tbody id="salesTbody" class="text-slate-900 dark:text-slate-200"></tbody>
            </table>
          </div>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 font-black">
          Tip: cambios sin guardar → modal si intentas cambiar de local.
        </div>
      </div>
    </div>
  `;

  const imgEl = q("pvImg");
  if (imgEl) imgEl.onerror = () => (imgEl.src = FALLBACK_IMG);

  const bind = (id) => {
    const el = q(id);
    if (!el) return;
    el.addEventListener("input", commitEditorChange);
    el.addEventListener("change", commitEditorChange);
  };

  ["f_img", "f_dep", "f_muni", "f_dir", "f_barrio", "f_wa", "f_lat", "f_lng"].forEach(bind);

  q("btnUploadImg")?.addEventListener("click", uploadImageForSelected);
  q("btnSaveCard")?.addEventListener("click", saveSelected);
  q("btnDeleteCard")?.addEventListener("click", deleteSelected);

  q("btnLoadSales")?.addEventListener("click", () => {
    const wrap = q("salesWrap");
    wrap?.classList?.remove?.("hidden");

    // defaults: últimos 7 días
    const fromEl = q("salesFrom");
    const toEl = q("salesTo");
    if (fromEl && !fromEl.value) fromEl.value = daysAgoISO(7);
    if (toEl && !toEl.value) toEl.value = todayISO();

    refreshSales();
  });

  q("btnRefreshSales")?.addEventListener("click", refreshSales);
}

function commitEditorChange() {
  const id = state.selectedPV;
  if (!id) return;

  const base = getEffectivePV(id);
  if (!base) return;

  const next = { ...base };
  next.URL_image = String(q("f_img")?.value || "");
  next.Departamento = String(q("f_dep")?.value || "").trim();
  next.Municipio = String(q("f_muni")?.value || "").trim();
  next.Direccion = String(q("f_dir")?.value || "").trim();
  next.Barrio = String(q("f_barrio")?.value || "").trim();
  next.num_whatsapp = String(q("f_wa")?.value || "").trim();

  next.Latitud = Number(String(q("f_lat")?.value || "").replace(",", "."));
  next.Longitud = Number(String(q("f_lng")?.value || "").replace(",", "."));

  setDraft(id, next);

  const imgEl = q("pvImg");
  if (imgEl) imgEl.src = next.URL_image?.trim() || FALLBACK_IMG;

  saveFilters();
}

// ---------- NAV ----------
async function trySelectPV(id) {
  const nextId = Number(id);
  if (Number(state.selectedPV) === nextId) return;

  if (state.selectedPV && state.dirtyIds.has(Number(state.selectedPV))) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Si cambias de local, se descartarán los cambios del local actual.",
      confirmText: "Descartar y cambiar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    clearDraft(state.selectedPV);
  }

  state.selectedPV = nextId;
  renderEditor();
  renderList();
}

async function trySwitchDep(dep) {
  if (String(state.selectedDep) === String(dep)) return;

  if (state.selectedPV && state.dirtyIds.has(Number(state.selectedPV))) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Cambiar el departamento puede ocultar el local actual. ¿Descartar cambios?",
      confirmText: "Descartar y cambiar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    clearDraft(state.selectedPV);
  }

  state.selectedDep = String(dep);

  const visibleIds = new Set(filtered().map((x) => Number(x.id)));
  if (state.selectedPV && !visibleIds.has(Number(state.selectedPV))) {
    state.selectedPV = null;
    renderEditor();
  }
  renderChips();
  renderList();
  saveFilters();
}

window.addEventListener("beforeunload", (e) => {
  if (state.dirtyIds.size > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ---------- IMAGE ----------
function isDeletableImageUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (u === FALLBACK_IMG) return false;
  if (u.startsWith("/") || u.startsWith("http://localhost")) return false;
  return true;
}

async function deleteImageByUrl(publicUrl) {
  if (!isDeletableImageUrl(publicUrl)) return { ok: true, skipped: true };

  const attempts = [
    { method: "POST", body: { publicUrl } },
    { method: "POST", body: { url: publicUrl } },
    { method: "POST", body: { imagen: publicUrl } },
    { method: "DELETE", body: { publicUrl } },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      await apiJSON(API.deleteImage, a);
      return { ok: true };
    } catch (e) {
      lastErr = e;
    }
  }
  return { ok: false, error: lastErr?.message || "No se pudo borrar la imagen" };
}

function pickImageFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/webp,image/png,image/jpeg";
    input.onchange = () =>
      resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

async function uploadImageForSelected() {
  if (!state.selectedPV) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un local primero.",
    });
  }

  const file = await pickImageFile();
  if (!file) return;

  if (file.type !== "image/webp") {
    const ok = await modalConfirm({
      tone: "info",
      icon: "image",
      title: "Sugerencia: WEBP",
      desc: "WEBP suele ser más liviano. ¿Deseas seguir con este archivo?",
      confirmText: "Seguir igual",
      cancelText: "Cancelar",
    });
    if (!ok) return;
  }

  showLoading("Subiendo imagen…");
  try {
    const fd = new FormData();
    fd.append("file", file);

    fd.append("scope", "puntos_venta");
    fd.append("slot", "pvimage");
    fd.append("recordKey", `pv-id-${state.selectedPV}`);

    const data = await apiJSON(API.uploadImage, { method: "POST", body: fd });
    const publicUrl = data.publicUrl;

    const imgInput = q("f_img");
    if (imgInput) imgInput.value = publicUrl;

    commitEditorChange();
    hideLoading();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Imagen subida",
      desc: "La URL se agregó al local. Recuerda guardar.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Subida de imagen PV");
  }
}

// ---------- CRUD ----------
async function loadMeta() {
  const data = await apiJSON(API.meta);
  state.meta.departamentos = data.departamentos || [];
  state.meta.municipiosByDepartamento = data.municipiosByDepartamento || {};
}

async function loadAll() {
  showLoading("Cargando puntos de venta…");
  try {
    const data = await apiJSON(API.list);
    const raw = Array.isArray(data.items) ? data.items : [];
    state.items = raw.map(normalizePV);
    hideLoading();
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Cargando PV");
  }
}

async function doCreatePV() {
  try {
    const values = await modalForm({
      title: "Crear local",
      desc: "Obligatorios: Departamento, Municipio, Dirección, Barrio, Latitud, Longitud. Barrio es UNIQUE.",
      confirmText: "Crear",
      fields: [
        { name: "Departamento", label: "Departamento", type: "text", required: true, placeholder: "Antioquia" },
        { name: "Municipio", label: "Municipio", type: "text", required: true, placeholder: "Medellín" },
        { name: "Direccion", label: "Dirección", type: "text", required: true, placeholder: "Cra 00 #00-00" },
        { name: "Barrio", label: "Barrio (UNIQUE)", type: "text", required: true, placeholder: "Laureles" },
        { name: "Latitud", label: "Latitud", type: "text", required: true, placeholder: "6.2442" },
        { name: "Longitud", label: "Longitud", type: "text", required: true, placeholder: "-75.5812" },
        { name: "num_whatsapp", label: "WhatsApp", type: "text", required: false, placeholder: "57..." },
      ],
    });

    if (!values) return;

    const payload = {
      Departamento: String(values.Departamento || "").trim(),
      Municipio: String(values.Municipio || "").trim(),
      Direccion: String(values.Direccion || "").trim(),
      Barrio: String(values.Barrio || "").trim(),
      Latitud: Number(String(values.Latitud || "").replace(",", ".")),
      Longitud: Number(String(values.Longitud || "").replace(",", ".")),
      num_whatsapp: String(values.num_whatsapp || "").trim() || null,
      URL_image: null,
    };

    if (!Number.isFinite(payload.Latitud) || !Number.isFinite(payload.Longitud)) {
      return modalAlert({ tone: "danger", icon: "error", title: "Coordenadas inválidas", desc: "Latitud y Longitud deben ser números." });
    }

    showLoading("Creando local…");
    const created = await apiJSON(API.create, { method: "POST", body: payload });
    hideLoading();

    await loadMeta();
    await loadAll();

    state.selectedPV = created.item?.id || null;
    renderAll();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Local creado",
      desc: "Ya puedes editarlo, subir imagen y guardar.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Creando local");
  }
}

async function saveSelected() {
  const id = state.selectedPV;
  if (!id) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un local primero.",
    });
  }

  const pv = getEffectivePV(id);
  if (!pv) return;

  if (!state.dirtyIds.has(Number(id))) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin cambios",
      desc: "Este local no tiene cambios pendientes.",
    });
  }

  if (!pv.Departamento) return modalAlert({ tone: "danger", icon: "error", title: "Falta Departamento", desc: "Es obligatorio." });
  if (!pv.Municipio) return modalAlert({ tone: "danger", icon: "error", title: "Falta Municipio", desc: "Es obligatorio." });
  if (!pv.Direccion) return modalAlert({ tone: "danger", icon: "error", title: "Falta Dirección", desc: "Es obligatoria." });
  if (!pv.Barrio) return modalAlert({ tone: "danger", icon: "error", title: "Falta Barrio", desc: "Es obligatorio (y es UNIQUE)." });
  if (!Number.isFinite(pv.Latitud)) return modalAlert({ tone: "danger", icon: "error", title: "Latitud inválida", desc: "Debe ser número." });
  if (!Number.isFinite(pv.Longitud)) return modalAlert({ tone: "danger", icon: "error", title: "Longitud inválida", desc: "Debe ser número." });

  showLoading("Guardando…");
  try {
    const data = await apiJSON(API.update(pv.id), { method: "PUT", body: pv });
    hideLoading();

    state.items = state.items.map((x) =>
      Number(x.id) === Number(pv.id) ? normalizePV(data.item) : x
    );
    clearDraft(pv.id);

    await loadMeta();

    renderAll();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Guardado",
      desc: "Cambios guardados correctamente.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Guardando local");
  }
}

async function deleteSelected() {
  const id = state.selectedPV;
  if (!id) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un local primero.",
    });
  }

  const pv = getEffectivePV(id);
  if (!pv) return;

  const imageUrl = String(pv.URL_image || "").trim();

  const ok = await modalConfirm({
    tone: "danger",
    icon: "warning",
    title: "Eliminar local",
    desc: `Se eliminará el local "${pv.Barrio}" (ID ${pv.id}). También intentaremos borrar su imagen del bucket.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  });
  if (!ok) return;

  showLoading("Eliminando local…");
  try {
    await apiJSON(API.remove(pv.id), { method: "DELETE" });

    const imgRes = await deleteImageByUrl(imageUrl);

    hideLoading();

    state.items = state.items.filter((x) => Number(x.id) !== Number(pv.id));
    clearDraft(pv.id);
    state.selectedPV = null;

    await loadMeta();
    renderAll();

    if (imgRes.skipped) {
      return modalAlert({
        tone: "success",
        icon: "check_circle",
        title: "Eliminado",
        desc: "Local eliminado. No había imagen válida para borrar.",
      });
    }
    if (!imgRes.ok) {
      return modalAlert({
        tone: "info",
        icon: "warning",
        title: "Local eliminado",
        desc: `El local se borró, pero la imagen pudo no borrarse.\nDetalle: ${imgRes.error}`,
      });
    }

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Eliminado",
      desc: "Local y su imagen eliminados.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Eliminando local");
  }
}

// ---------- SALES ----------
async function refreshSales() {
  const id = state.selectedPV;
  if (!id) return;

  const from = q("salesFrom")?.value || "";
  const to = q("salesTo")?.value || "";

  const tbody = q("salesTbody");
  const note = q("salesNote");
  const meta = q("salesMeta");
  const kpiQty = q("kpiQty");
  const kpiRevenue = q("kpiRevenue");

  if (tbody) tbody.innerHTML = `<tr><td class="py-2" colspan="3">Cargando…</td></tr>`;
  if (note) note.textContent = "";

  try {
    const data = await apiJSON(API.sales(id, from, to));
    if (meta) {
      meta.textContent =
        data.from || data.to
          ? `${data.from || "—"} → ${data.to || "—"}`
          : "Rango: (sin filtro)";
    }

    if (kpiQty) kpiQty.textContent = String(data.totals?.qty ?? 0);
    if (kpiRevenue) kpiRevenue.textContent = String(data.totals?.revenue ?? 0);

    if (note) note.textContent = data.note ? String(data.note) : "";

    const items = Array.isArray(data.items) ? data.items : [];
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td class="py-2 text-slate-500 dark:text-slate-400" colspan="3">Sin ventas en este rango.</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .map(
        (it) => `
      <tr class="border-t border-slate-200 dark:border-slate-800">
        <td class="py-2 pr-2">${escapeHtml(it.name || ("Producto " + it.product_id))}</td>
        <td class="py-2 pr-2">${escapeHtml(it.qty ?? 0)}</td>
        <td class="py-2 pr-2">${escapeHtml(it.revenue ?? 0)}</td>
      </tr>
    `
      )
      .join("");
  } catch (e) {
    if (tbody) {
      tbody.innerHTML = `<tr><td class="py-2 text-rose-600" colspan="3">Error: ${escapeHtml(
        e.message || "Error"
      )}</td></tr>`;
    }
  }
}

// ---------- RENDER ALL ----------
function renderAll() {
  renderDropdowns();
  renderChips();
  renderList();
  renderEditor();
  setDirtyBadge();
}

function resetFilters() {
  if (els.qSearch) els.qSearch.value = "";
  if (els.qDep) els.qDep.value = "all";
  if (els.qMuni) els.qMuni.value = "all";
  state.selectedDep = "all";
  saveFilters();
  renderAll();
}

// ---------- WIRE ----------
els.qSearch?.addEventListener("input", () => {
  renderChips();
  renderList();
  saveFilters();
});

els.qDep?.addEventListener("change", () => {
  renderDropdowns();
  renderChips();
  renderList();
  saveFilters();
});

els.qMuni?.addEventListener("change", () => {
  renderChips();
  renderList();
  saveFilters();
});

els.btnReset?.addEventListener("click", resetFilters);

els.btnReload?.addEventListener("click", async () => {
  if (state.dirtyIds.size > 0) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Recargar descartará cambios no guardados. ¿Continuar?",
      confirmText: "Sí, recargar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    state.draftById.clear();
    state.dirtyIds.clear();
    setDirtyBadge();
  }

  await loadMeta();
  await loadAll();

  renderAll();
});

els.btnAddPV?.addEventListener("click", doCreatePV);
els.btnSaveSelected?.addEventListener("click", saveSelected);
els.btnDeleteSelected?.addEventListener("click", deleteSelected);

// ---------- INIT ----------
(async function init() {
  await loadMeta();
  await loadAll();

  loadFilters();     // restaura inputs/estado
  renderAll();       // pinta

  // Ajuste: si qDep restaurado, refresca municipios
  renderDropdowns();
})();
