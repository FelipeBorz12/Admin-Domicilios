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

  // ✅ ventas por timestamps (para turno)
  salesTS: (id, from_ts, to_ts) => {
    const qs = new URLSearchParams();
    if (from_ts) qs.set("from_ts", from_ts);
    if (to_ts) qs.set("to_ts", to_ts);
    return `/api/admin/pv/${id}/sales-ts?` + qs.toString();
  },

  // ✅ dashboard global (totales por rango)
  salesSummary: (from, to) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return `/api/admin/pv/sales/summary?` + qs.toString();
  },

  // ✅ turnos activos
  activeShifts: "/api/admin/shifts/active",

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

function clickFX(el) {
  if (!el) return;
  el.classList.add("clicking");
  setTimeout(() => el.classList.remove("clicking"), 260);
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

const els = {
  uiModal: q("uiModal"),
  uiModalIconWrap: q("uiModalIconWrap"),
  uiModalIcon: q("uiModalIcon"),
  uiModalTitle: q("uiModalTitle"),
  uiModalDesc: q("uiModalDesc"),
  uiModalBody: q("uiModalBody"),
  uiModalActions: q("uiModalActions"),

  depChips: q("depChips"),
  depScrollWrap: q("depScrollWrap"),
  depScrollLeft: q("depScrollLeft"),
  depScrollRight: q("depScrollRight"),
  depHint: q("depHint"),
  countText: q("countText"),

  qSearch: q("qSearch"),
  qDep: q("qDep"),
  qMuni: q("qMuni"),

  btnReset: q("btnReset"),
  btnReload: q("btnReload"),
  btnAddPV: q("btnAddPV"),

  btnDashboard: q("btnDashboard"),
  dashModal: q("dashModal"),
  btnDashClose: q("btnDashClose"),
  btnDashLoad: q("btnDashLoad"),
  btnDashRefresh: q("btnDashRefresh"),
  dashMount: q("dashMount"),
  dashSub: q("dashSub"),
  dashRange: q("dashRange"),

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
      "rounded-full px-5 py-2.5 text-sm font-black transition border click-pop";

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
      clickFX(btn);
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
        input.className = "h-5 w-5";
        input.checked = !!f.value;
      } else {
        input = document.createElement("input");
        input.type = f.type || "text";
        input.className = "field-input";
        input.value = String(f.value ?? "");
        if (f.placeholder) input.placeholder = f.placeholder;
      }

      input.dataset.mf = f.name;
      lab.appendChild(input);

      if (f.hint) {
        const h = document.createElement("div");
        h.className = "field-hint";
        h.textContent = f.hint;
        lab.appendChild(h);
      }

      mount.appendChild(lab);
    });
  });
}

// ---------- helpers time ----------
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dateToYYYYMMDD(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function fmtMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}
function fmtNum(n) {
  const x = Number(n || 0);
  return x.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-CO", { hour12: true });
}

// ---------- State ----------
const state = {
  meta: { deps: [], munisByDep: {} },
  items: [],

  selectedPV: null,
  selectedDep: "all",

  draftById: new Map(),
  dirtyIds: new Set(),

  activeShifts: [],
  activeShiftByPvId: new Map(),

  dashboard: {
    loaded: false,
    lastPayload: null,
  },
};

function saveFilters() {
  const payload = {
    q: els.qSearch?.value || "",
    dep: els.qDep?.value || "all",
    muni: els.qMuni?.value || "all",
    selectedDep: state.selectedDep || "all",
  };
  try {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(payload));
  } catch {}
}
function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return;
    const x = JSON.parse(raw);
    if (els.qSearch && typeof x.q === "string") els.qSearch.value = x.q;
    if (els.qDep && typeof x.dep === "string") els.qDep.value = x.dep;
    if (els.qMuni && typeof x.muni === "string") els.qMuni.value = x.muni;
    if (typeof x.selectedDep === "string") state.selectedDep = x.selectedDep;
  } catch {}
}
function setDirtyBadge() {
  const b = els.dirtyBadge;
  if (!b) return;
  if (state.dirtyIds.size > 0) b.classList.remove("hidden");
  else b.classList.add("hidden");
}

function normalizePV(pv) {
  const out = { ...pv };
  out.id = Number(out.id);
  out.Departamento = String(out.Departamento ?? "").trim();
  out.Municipio = String(out.Municipio ?? "").trim();
  out.Direccion = String(out.Direccion ?? "").trim();
  out.Barrio = String(out.Barrio ?? "").trim();
  out.URL_image = out.URL_image ? String(out.URL_image) : null;
  out.Latitud = Number(out.Latitud);
  out.Longitud = Number(out.Longitud);
  out.num_whatsapp = out.num_whatsapp ? String(out.num_whatsapp) : null;
  return out;
}

function getFilteredItems() {
  const qTxt = String(els.qSearch?.value || "")
    .trim()
    .toLowerCase();

  const depFromState = String(state.selectedDep || "all");
  const dep = depFromState !== "all" ? depFromState : els.qDep?.value || "all";
  const muni = els.qMuni?.value || "all";

  return state.items.filter((it) => {
    if (dep !== "all" && it.Departamento !== dep) return false;
    if (muni !== "all" && it.Municipio !== muni) return false;

    if (!qTxt) return true;
    return `${it.id} ${it.Barrio} ${it.Direccion} ${it.Departamento} ${it.Municipio}`
      .toLowerCase()
      .includes(qTxt);
  });
}

function getEffectivePV(id) {
  const base = state.items.find((x) => Number(x.id) === Number(id));
  if (!base) return null;
  const draft = state.draftById.get(Number(id));
  return draft ? { ...base, ...draft } : base;
}

function setDraft(id, patch) {
  const key = Number(id);
  const prev = state.draftById.get(key) || {};
  state.draftById.set(key, { ...prev, ...patch });
  state.dirtyIds.add(key);
  setDirtyBadge();
}
function clearDraft(id) {
  const key = Number(id);
  state.draftById.delete(key);
  state.dirtyIds.delete(key);
  setDirtyBadge();
}

// ---------- Data Load ----------
async function loadMeta() {
  const data = await apiJSON(API.meta);

  // ✅ ahora viene desde Departamentos_list / Municipio_list
  const deps = Array.isArray(data.departamentos) ? data.departamentos : [];
  const munisByDep =
    data.municipiosByDepartamento &&
    typeof data.municipiosByDepartamento === "object"
      ? data.municipiosByDepartamento
      : {};

  state.meta = { deps, munisByDep };
}

async function loadAll() {
  const data = await apiJSON(API.list);
  state.items = Array.isArray(data.items) ? data.items.map(normalizePV) : [];
}

// ✅ load active shifts (store_id = pv.id)
async function loadActiveShifts() {
  try {
    const data = await apiJSON(API.activeShifts);
    const shifts = Array.isArray(data.items) ? data.items : [];
    state.activeShifts = shifts;

    state.activeShiftByPvId = new Map();
    for (const s of shifts) {
      const pvId = String(s.store_id ?? "").trim();
      if (!pvId) continue;
      state.activeShiftByPvId.set(pvId, s);
    }
  } catch (e) {
    console.warn("[shifts] no se pudo cargar active shifts:", e?.message || e);
    state.activeShifts = [];
    state.activeShiftByPvId = new Map();
  }
}

// ---------- Render Dropdowns ----------
function renderDropdowns() {
  // Departamento
  if (els.qDep) {
    const cur = els.qDep.value || "all";
    els.qDep.innerHTML = `<option value="all">Todos</option>`;
    state.meta.deps.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      els.qDep.appendChild(o);
    });
    els.qDep.value = state.meta.deps.includes(cur) ? cur : "all";
  }

  // Municipio depende del departamento seleccionado (state > dropdown)
  if (els.qMuni) {
    const dep =
      state.selectedDep && state.selectedDep !== "all"
        ? state.selectedDep
        : els.qDep?.value || "all";

    const cur = els.qMuni.value || "all";
    els.qMuni.innerHTML = `<option value="all">Todos</option>`;

    const munis = dep !== "all" ? state.meta.munisByDep[dep] || [] : [];
    munis.forEach((m) => {
      const o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      els.qMuni.appendChild(o);
    });

    if (dep === "all") els.qMuni.value = "all";
    else els.qMuni.value = munis.includes(cur) ? cur : "all";
  }
}

// ---------- Render Chips ----------
function renderChips() {
  if (!els.depChips) return;

  const counts = new Map();
  for (const it of state.items) {
    const d = it.Departamento || "—";
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  const allCount = state.items.length;

  const makeChip = (label, value, count) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip click-pop";
    btn.dataset.dep = value;

    const isActive = String(state.selectedDep || "all") === value;
    if (isActive) btn.classList.add("chip--active");

    btn.innerHTML = `
      <span>${escapeHtml(label)}</span>
      <span class="chip-badge">${escapeHtml(count)}</span>
    `;

    btn.addEventListener("click", async () => {
      clickFX(btn);
      state.selectedDep = value;

      // sincroniza dropdowns
      if (els.qDep) els.qDep.value = value;
      if (els.qMuni) els.qMuni.value = "all";

      saveFilters();
      renderDropdowns();
      renderChips();
      renderList();
    });

    return btn;
  };

  els.depChips.innerHTML = "";
  els.depChips.appendChild(makeChip("Todos", "all", allCount));

  state.meta.deps.forEach((d) => {
    const c = counts.get(d) || 0;
    els.depChips.appendChild(makeChip(d, d, c));
  });

  if (els.countText) {
    const filtered = getFilteredItems();
    const dep =
      state.selectedDep && state.selectedDep !== "all"
        ? state.selectedDep
        : els.qDep?.value || "all";

    const muni = els.qMuni?.value || "all";
    const qTxt = String(els.qSearch?.value || "").trim();

    const parts = [];
    if (dep !== "all") parts.push(dep);
    if (muni !== "all") parts.push(muni);
    if (qTxt) parts.push(`"${qTxt}"`);

    els.countText.textContent =
      parts.length > 0
        ? `${filtered.length} • ${parts.join(" • ")}`
        : `${filtered.length}`;
  }
}

// ---------- Render List ----------
function renderList() {
  if (!els.pvList) return;

  const list = getFilteredItems();
  if (els.listCount) els.listCount.textContent = `${list.length} locales`;

  if (list.length === 0) {
    els.pvList.innerHTML = `
      <div class="text-sm text-slate-600 dark:text-slate-300 p-4">
        No hay resultados con los filtros actuales.
      </div>
    `;
    return;
  }

  els.pvList.innerHTML = "";
  list
    .slice()
    .sort((a, b) => String(a.Barrio).localeCompare(String(b.Barrio)))
    .forEach((it) => {
      const row = document.createElement("div");
      row.className = "list-item click-pop";
      if (Number(state.selectedPV) === Number(it.id))
        row.classList.add("list-item--active");

      const dirty = state.dirtyIds.has(Number(it.id));
      const shift = state.activeShiftByPvId.get(String(it.id));
      const hasShift = !!shift;

      row.innerHTML = `
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <div class="mini-title truncate">${escapeHtml(
              it.Barrio || "PV " + it.id
            )}</div>
            <span class="inline-flex items-center gap-2 text-[11px] font-black px-2 py-1 rounded-full
              ${
                hasShift
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }">
              <span class="status-dot ${
                hasShift ? "dot-on" : "dot-off"
              }"></span>
              ${hasShift ? "Turno activo" : "Sin turno"}
            </span>
          </div>

          <div class="mini-muted mt-1 truncate">
            ${escapeHtml(it.Departamento || "—")} • ${escapeHtml(
        it.Municipio || "—"
      )}
          </div>

          <div class="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1 truncate">
            ${escapeHtml(it.Direccion || "")}
          </div>

          ${
            hasShift
              ? `<div class="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-200 mt-1 truncate">
                   Abierto: ${escapeHtml(fmtDateTime(shift.opened_at))}
                 </div>`
              : ""
          }
        </div>

        <div class="flex flex-col items-end gap-2">
          <div class="text-[11px] font-black text-slate-500 dark:text-slate-400">#${escapeHtml(
            it.id
          )}</div>
          ${
            dirty
              ? `<span class="text-[10px] font-black px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">PENDIENTE</span>`
              : ""
          }
        </div>
      `;

      row.addEventListener("click", async () => {
        clickFX(row);
        if (Number(state.selectedPV) === Number(it.id)) return;

        if (state.selectedPV && state.dirtyIds.has(Number(state.selectedPV))) {
          const ok = await modalConfirm({
            tone: "info",
            icon: "warning",
            title: "Tienes cambios sin guardar",
            desc: "Si cambias de local, tus cambios quedarán pendientes (no se guardan automáticamente). ¿Continuar?",
            confirmText: "Sí, cambiar",
            cancelText: "Cancelar",
          });
          if (!ok) return;
        }

        state.selectedPV = Number(it.id);
        renderList();
        renderEditor();
      });

      els.pvList.appendChild(row);
    });
}

// ---------- Editor (ventas PV) ----------
async function fetchSalesForPV(id, from, to) {
  try {
    return await apiJSON(API.sales(id, from, to));
  } catch (e) {
    return {
      ok: false,
      error: e.message || "Error",
      totals: { qty: 0, revenue: 0 },
      items: [],
    };
  }
}
async function fetchSalesForPVShift(id, from_ts, to_ts) {
  try {
    return await apiJSON(API.salesTS(id, from_ts, to_ts));
  } catch (e) {
    return {
      ok: false,
      error: e.message || "Error",
      totals: { qty: 0, revenue: 0 },
      items: [],
    };
  }
}

function renderEditor() {
  if (!els.editorWrap) return;

  const id = state.selectedPV;
  if (!id) {
    els.editorWrap.innerHTML = `
      <div class="text-sm text-slate-600 dark:text-slate-300">
        Selecciona un local en la columna del medio para editarlo.
      </div>
    `;
    if (els.selectedMeta) els.selectedMeta.textContent = "—";
    return;
  }

  const pv = getEffectivePV(id);
  if (!pv) return;

  const shift = state.activeShiftByPvId.get(String(pv.id));
  const hasShift = !!shift;

  if (els.selectedMeta) {
    els.selectedMeta.textContent = `ID ${pv.id} • ${pv.Departamento || "—"} • ${
      pv.Municipio || "—"
    }`;
  }

  const img = String(pv.URL_image || "").trim() || FALLBACK_IMG;

  els.editorWrap.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-start gap-4">
        <div class="img-thumb">
          <img src="${escapeHtml(img)}" onerror="this.src='${escapeHtml(
    FALLBACK_IMG
  )}';" alt="PV"/>
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-black text-slate-900 dark:text-white truncate">
                ${escapeHtml(pv.Barrio || "PV " + pv.id)}
              </div>
              <div class="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1 truncate">
                ${escapeHtml(pv.Direccion || "")}
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 truncate">
                ${escapeHtml(pv.Departamento || "—")} • ${escapeHtml(
    pv.Municipio || "—"
  )}
              </div>
            </div>

            <div class="shrink-0">
              <div class="inline-flex items-center gap-2 text-[12px] font-black px-3 py-2 rounded-full
                ${
                  hasShift
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-200"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }">
                <span class="status-dot ${
                  hasShift ? "dot-on" : "dot-off"
                }"></span>
                ${hasShift ? "Turno activo" : "Sin turno"}
              </div>
            </div>
          </div>

          ${
            hasShift
              ? `<div class="mt-2 text-xs font-extrabold text-emerald-700 dark:text-emerald-200">
                   Abierto: ${escapeHtml(fmtDateTime(shift.opened_at))}
                   ${
                     shift.admin_name
                       ? ` • ${escapeHtml(shift.admin_name)}`
                       : ""
                   }
                 </div>`
              : `<div class="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                   No hay turno activo para este local.
                 </div>`
          }
        </div>
      </div>

      <!-- (Opcional) aquí dejas ventas PV si quieres, pero no global -->
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div class="flex items-center justify-between gap-2">
          <div class="text-sm font-black text-slate-900 dark:text-white">Resumen de ventas (30D)</div>
          <div id="pvTopMeta" class="text-xs text-slate-500 dark:text-slate-400 font-bold">—</div>
        </div>
        <div class="mt-3 overflow-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-slate-500 dark:text-slate-400">
                <th class="pb-2 pr-2">Producto</th>
                <th class="pb-2 pr-2">Qty</th>
                <th class="pb-2 pr-2">Revenue</th>
              </tr>
            </thead>
            <tbody id="pvTopTbody"></tbody>
          </table>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
        <div class="text-sm font-black text-slate-900 dark:text-white">Turno</div>
        <div id="pvShiftBox" class="mt-2 text-sm text-slate-600 dark:text-slate-300">
          ${hasShift ? "Cargando…" : "Sin turno activo."}
        </div>
      </div>

      <div class="grid gap-3">
        <label class="field">
          <span class="field-label">Departamento</span>
          <input id="ed_Departamento" class="field-input" value="${escapeHtml(
            pv.Departamento || ""
          )}" placeholder="Ej: Antioquia" />
        </label>

        <label class="field">
          <span class="field-label">Municipio</span>
          <input id="ed_Municipio" class="field-input" value="${escapeHtml(
            pv.Municipio || ""
          )}" placeholder="Ej: Medellín" />
        </label>

        <label class="field">
          <span class="field-label">Dirección</span>
          <input id="ed_Direccion" class="field-input" value="${escapeHtml(
            pv.Direccion || ""
          )}" placeholder="Ej: Cra 00 #00-00" />
        </label>

        <label class="field">
          <span class="field-label">Barrio (UNIQUE)</span>
          <input id="ed_Barrio" class="field-input" value="${escapeHtml(
            pv.Barrio || ""
          )}" placeholder="Ej: Laureles" />
          <div class="field-hint">Este campo debe ser único en la base de datos.</div>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Latitud</span>
            <input id="ed_Latitud" class="field-input" value="${escapeHtml(
              pv.Latitud ?? ""
            )}" placeholder="Ej: 6.2442" />
          </label>

          <label class="field">
            <span class="field-label">Longitud</span>
            <input id="ed_Longitud" class="field-input" value="${escapeHtml(
              pv.Longitud ?? ""
            )}" placeholder="Ej: -75.5812" />
          </label>
        </div>

        <label class="field">
          <span class="field-label">WhatsApp</span>
          <input id="ed_num_whatsapp" class="field-input" value="${escapeHtml(
            pv.num_whatsapp ?? ""
          )}" placeholder="Ej: 573001234567" />
          <div class="field-hint">Opcional. Solo números (ideal: con indicativo país).</div>
        </label>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
          <div class="text-sm font-black text-slate-900 dark:text-white">Imagen</div>
          <div class="mt-2 grid gap-2">
            <input id="ed_image_file" type="file" accept="image/*" class="block w-full text-sm" />
            <div class="flex gap-2">
              <button id="btnUploadImage" type="button" class="rounded-full px-4 py-2 text-sm font-black btn-primary click-pop">
                Subir
              </button>
              <button id="btnClearImage" type="button" class="rounded-full px-4 py-2 text-sm font-black btn-soft border border-slate-200 dark:border-slate-700 click-pop">
                Quitar
              </button>
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 font-bold">
              Si la URL queda vacía, se mostrará la imagen por defecto.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const bind = (idEl, key, parser = (v) => v) => {
    const el = q(idEl);
    if (!el) return;
    el.addEventListener("input", () => {
      setDraft(pv.id, { [key]: parser(el.value) });
      renderList();
    });
  };

  bind("ed_Departamento", "Departamento", (v) => String(v || "").trim());
  bind("ed_Municipio", "Municipio", (v) => String(v || "").trim());
  bind("ed_Direccion", "Direccion", (v) => String(v || "").trim());
  bind("ed_Barrio", "Barrio", (v) => String(v || "").trim());
  bind("ed_Latitud", "Latitud", (v) =>
    Number(String(v || "").replace(",", "."))
  );
  bind("ed_Longitud", "Longitud", (v) =>
    Number(String(v || "").replace(",", "."))
  );
  bind("ed_num_whatsapp", "num_whatsapp", (v) => {
    const x = String(v || "").trim();
    return x ? x : null;
  });

  q("btnClearImage")?.addEventListener("click", async (e) => {
    clickFX(e.currentTarget);
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Quitar imagen",
      desc: "Se quitará la URL de la imagen del local. La imagen por defecto se mostrará en su lugar.",
      confirmText: "Quitar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    setDraft(pv.id, { URL_image: null });
    renderEditor();
    renderList();
  });

  q("btnUploadImage")?.addEventListener("click", async (e) => {
    clickFX(e.currentTarget);
    const file = q("ed_image_file")?.files?.[0];
    if (!file) {
      return modalAlert({
        tone: "info",
        icon: "info",
        title: "Falta archivo",
        desc: "Selecciona una imagen antes de subir.",
      });
    }

    try {
      showLoading("Subiendo imagen…");
      const form = new FormData();
      form.append("file", file);
      form.append("bucket", "puntos_venta");
      form.append("path", "pvimage");
      form.append("prefix", `pv_${pv.id}_`);

      const data = await apiJSON(API.uploadImage, {
        method: "POST",
        body: form,
      });

      hideLoading();

      const url = data.url || data.publicUrl || data.path || "";
      if (!url) {
        return modalAlert({
          tone: "danger",
          icon: "error",
          title: "No se obtuvo URL",
          desc: "El servidor respondió pero no devolvió URL.",
        });
      }

      setDraft(pv.id, { URL_image: String(url) });
      renderEditor();
      renderList();

      modalAlert({
        tone: "success",
        icon: "check_circle",
        title: "Imagen subida",
        desc: "No olvides Guardar el local para persistir la URL.",
      });
    } catch (e2) {
      hideLoading();
      modalErrorFriendly(e2, "Subiendo imagen");
    }
  });

  // Solo “top productos 30D” (no dashboard global)
  void hydratePvMini(pv, shift);
}

async function hydratePvMini(pv, shift) {
  const id = Number(pv.id);
  const today = dateToYYYYMMDD(new Date());
  const from30 = dateToYYYYMMDD(daysAgo(29));

  const shiftBox = q("pvShiftBox");
  if (shiftBox) {
    if (!shift) shiftBox.textContent = "Sin turno activo.";
    else {
      shiftBox.innerHTML = `
        <div class="grid gap-1 text-sm">
          <div><b>ID:</b> ${escapeHtml(shift.id)}</div>
          <div><b>PV ID:</b> ${escapeHtml(shift.store_id || "—")}</div>
          <div><b>Abierto:</b> ${escapeHtml(fmtDateTime(shift.opened_at))}</div>
          ${
            shift.admin_name
              ? `<div><b>Admin:</b> ${escapeHtml(shift.admin_name)}</div>`
              : ""
          }
          ${
            shift.sede_name
              ? `<div><b>Sede:</b> ${escapeHtml(shift.sede_name)}</div>`
              : ""
          }
        </div>
      `;
    }
  }

  const s30d = await fetchSalesForPV(id, from30, today);

  const meta = q("pvTopMeta");
  if (meta) meta.textContent = `${from30} → ${today}`;

  const tbody = q("pvTopTbody");
  if (tbody) {
    const items = Array.isArray(s30d.items) ? s30d.items.slice(0, 12) : [];
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td class="py-2 text-slate-500 dark:text-slate-400" colspan="3">Sin ventas.</td></tr>`;
    } else {
      tbody.innerHTML = items
        .map(
          (it) => `
        <tr class="border-t border-slate-200 dark:border-slate-800">
          <td class="py-2 pr-2">${escapeHtml(
            it.name || "Producto " + it.product_id
          )}</td>
          <td class="py-2 pr-2">${escapeHtml(it.qty ?? 0)}</td>
          <td class="py-2 pr-2">$ ${escapeHtml(fmtMoney(it.revenue ?? 0))}</td>
        </tr>
      `
        )
        .join("");
    }
  }
}

// ---------- Image helpers ----------
async function deleteImageByUrl(url) {
  const u = String(url || "").trim();
  if (!u || u === FALLBACK_IMG) return { ok: true, skipped: true };

  try {
    const res = await apiJSON(API.deleteImage, {
      method: "POST",
      body: { url: u },
    });
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: e.message || "Error" };
  }
}

// ---------- CRUD ----------
async function doCreatePV() {
  try {
    const values = await modalForm({
      title: "Crear local",
      desc: "Completa los datos básicos. Esto también registrará Departamento/Municipio en sus tablas si no existen.",
      icon: "add_business",
      tone: "info",
      confirmText: "Crear",
      cancelText: "Cancelar",
      fields: [
        {
          name: "Departamento",
          label: "Departamento",
          required: true,
          value: "",
        },
        { name: "Municipio", label: "Municipio", required: true, value: "" },
        { name: "Direccion", label: "Dirección", required: true, value: "" },
        { name: "Barrio", label: "Barrio (UNIQUE)", required: true, value: "" },
        {
          name: "Latitud",
          label: "Latitud",
          required: true,
          value: "",
          placeholder: "6.2442",
        },
        {
          name: "Longitud",
          label: "Longitud",
          required: true,
          value: "",
          placeholder: "-75.5812",
        },
        {
          name: "num_whatsapp",
          label: "WhatsApp (opcional)",
          required: false,
          value: "",
        },
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

    if (
      !Number.isFinite(payload.Latitud) ||
      !Number.isFinite(payload.Longitud)
    ) {
      return modalAlert({
        tone: "danger",
        icon: "error",
        title: "Coordenadas inválidas",
        desc: "Latitud y Longitud deben ser números.",
      });
    }

    showLoading("Creando local…");
    const created = await apiJSON(API.create, {
      method: "POST",
      body: payload,
    });
    hideLoading();

    // recarga meta desde tablas list + items
    await loadMeta();
    await loadAll();
    await loadActiveShifts();

    state.selectedPV = created.item?.id || null;

    // cuando creas, resetea chip dep a "all" para no “esconderlo”
    state.selectedDep = "all";
    if (els.qDep) els.qDep.value = "all";
    if (els.qMuni) els.qMuni.value = "all";

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

  if (!pv.Departamento)
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Falta Departamento",
      desc: "Es obligatorio.",
    });
  if (!pv.Municipio)
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Falta Municipio",
      desc: "Es obligatorio.",
    });
  if (!pv.Direccion)
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Falta Dirección",
      desc: "Es obligatoria.",
    });
  if (!pv.Barrio)
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Falta Barrio",
      desc: "Es obligatorio (y es UNIQUE).",
    });
  if (!Number.isFinite(pv.Latitud))
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Latitud inválida",
      desc: "Debe ser número.",
    });
  if (!Number.isFinite(pv.Longitud))
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Longitud inválida",
      desc: "Debe ser número.",
    });

  showLoading("Guardando…");
  try {
    const data = await apiJSON(API.update(pv.id), { method: "PUT", body: pv });
    hideLoading();

    state.items = state.items.map((x) =>
      Number(x.id) === Number(pv.id) ? normalizePV(data.item) : x
    );
    clearDraft(pv.id);

    // ✅ importante: refrescar meta desde tablas
    await loadMeta();
    await loadActiveShifts();

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
    await loadActiveShifts();
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

// ---------- Dashboard (lazy) ----------
function openDash() {
  els.dashModal?.classList?.remove("hidden");
  document.body.style.overflow = "hidden";

  if (els.dashMount && !els.dashMount.innerHTML.trim()) {
    els.dashMount.innerHTML = `
      <div class="text-sm text-slate-600 dark:text-slate-300">
        Pulsa <b>Cargar</b> para traer la información.
      </div>
    `;
  }

  els.dashSub.textContent = state.dashboard.loaded
    ? "Dashboard cargado. Puedes actualizar."
    : "Pulsa “Cargar” para ver ventas y turnos.";
  els.btnDashRefresh.disabled = !state.dashboard.loaded;
}

function closeDash() {
  els.dashModal?.classList?.add("hidden");
  document.body.style.overflow = "";
}
els.dashModal?.addEventListener("click", (e) => {
  if (e.target.closest("[data-dash-close]")) closeDash();
});

function svgBarChart(values, { height = 70, pad = 6 } = {}) {
  const w = 220;
  const h = height;
  const max = Math.max(...values, 1);
  const n = values.length || 1;
  const gap = 3;
  const barW = Math.max(2, Math.floor((w - pad * 2 - gap * (n - 1)) / n));

  let x = pad;
  const bars = values
    .map((v) => {
      const bh = Math.max(1, Math.round((v / max) * (h - pad * 2)));
      const y = h - pad - bh;
      const rect = `<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="2" ry="2" opacity="0.9"></rect>`;
      x += barW + gap;
      return rect;
    })
    .join("");

  return `
    <svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="chart">
      <rect x="0" y="0" width="${w}" height="${h}" rx="10" ry="10" opacity="0.06"></rect>
      ${bars}
    </svg>
  `;
}

async function loadDashboardGlobal() {
  // lazy: SOLO al abrir y pulsar cargar
  const today = dateToYYYYMMDD(new Date());
  const from7 = dateToYYYYMMDD(daysAgo(6));
  const from30 = dateToYYYYMMDD(daysAgo(29));

  els.dashRange.textContent = `${from30} → ${today}`;
  els.dashMount.innerHTML = "";

  showLoading("Cargando dashboard…");
  try {
    const [shifts, sum7, sum30] = await Promise.all([
      apiJSON(API.activeShifts).catch(() => ({ ok: true, items: [] })),
      apiJSON(API.salesSummary(from7, today)),
      apiJSON(API.salesSummary(from30, today)),
    ]);

    // series diaria (7 y 30) = múltiples llamadas, pero solo bajo demanda
    const days7 = [];
    for (let i = 6; i >= 0; i--) days7.push(dateToYYYYMMDD(daysAgo(i)));
    const series7 = await Promise.all(
      days7.map((d) =>
        apiJSON(API.salesSummary(d, d)).catch(() => ({
          ok: true,
          totals: { revenue: 0, qty: 0 },
        }))
      )
    );

    const days30 = [];
    for (let i = 29; i >= 0; i--) days30.push(dateToYYYYMMDD(daysAgo(i)));
    const series30 = await Promise.all(
      days30.map((d) =>
        apiJSON(API.salesSummary(d, d)).catch(() => ({
          ok: true,
          totals: { revenue: 0, qty: 0 },
        }))
      )
    );

    const rev7 = series7.map((x) => Number(x.totals?.revenue || 0));
    const rev30 = series30.map((x) => Number(x.totals?.revenue || 0));

    const activeCount = Array.isArray(shifts.items) ? shifts.items.length : 0;

    els.dashMount.innerHTML = `
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="dash-card">
          <div class="dash-label">Ventas 7D</div>
          <div class="dash-value">$ ${escapeHtml(
            fmtMoney(sum7.totals?.revenue ?? 0)
          )}</div>
          <div class="dash-sub">${escapeHtml(
            fmtNum(sum7.totals?.qty ?? 0)
          )} ítems</div>
        </div>

        <div class="dash-card">
          <div class="dash-label">Ventas 30D</div>
          <div class="dash-value">$ ${escapeHtml(
            fmtMoney(sum30.totals?.revenue ?? 0)
          )}</div>
          <div class="dash-sub">${escapeHtml(
            fmtNum(sum30.totals?.qty ?? 0)
          )} ítems</div>
        </div>

        <div class="dash-card">
          <div class="dash-label">Turnos activos</div>
          <div class="dash-value">${escapeHtml(fmtNum(activeCount))}</div>
          <div class="dash-sub">${
            activeCount ? "En curso ahora" : "Ninguno activo"
          }</div>
        </div>

        <div class="dash-card">
          <div class="dash-label">Locales</div>
          <div class="dash-value">${escapeHtml(
            fmtNum(state.items.length)
          )}</div>
          <div class="dash-sub">Total en sistema</div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 lg:grid-cols-2">
        <div class="dash-card">
          <div class="flex items-center justify-between gap-2">
            <div class="dash-label">Ventas diarias (7D)</div>
            <div class="text-[11px] font-black text-slate-500 dark:text-slate-400">${escapeHtml(
              days7[0]
            )} → ${escapeHtml(days7[6])}</div>
          </div>
          <div class="mt-2">${svgBarChart(rev7, { height: 80 })}</div>
          <div class="dash-sub">Picos y caídas por día</div>
        </div>

        <div class="dash-card">
          <div class="flex items-center justify-between gap-2">
            <div class="dash-label">Ventas diarias (30D)</div>
            <div class="text-[11px] font-black text-slate-500 dark:text-slate-400">${escapeHtml(
              days30[0]
            )} → ${escapeHtml(days30[29])}</div>
          </div>
          <div class="mt-2">${svgBarChart(rev30, { height: 80 })}</div>
          <div class="dash-sub">Tendencia mensual</div>
        </div>
      </div>
    `;

    state.dashboard.loaded = true;
    state.dashboard.lastPayload = { sum7, sum30, activeCount };
    els.btnDashRefresh.disabled = false;
    els.dashSub.textContent = "Dashboard cargado.";
  } catch (e) {
    modalErrorFriendly(e, "Dashboard global");
    els.dashMount.innerHTML = `<div class="text-sm text-slate-600 dark:text-slate-300">No se pudo cargar el dashboard.</div>`;
  } finally {
    hideLoading();
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
  // si el usuario usa dropdown, “resetea chips” a all y usa dropdown
  state.selectedDep = "all";
  if (els.qMuni) els.qMuni.value = "all";
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

els.btnReset?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  resetFilters();
});

els.btnReload?.addEventListener("click", async (e) => {
  clickFX(e.currentTarget);

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

  showLoading("Recargando datos…");
  try {
    await loadMeta();
    await loadAll();
    await loadActiveShifts();
    renderAll();
  } finally {
    hideLoading();
  }
});

els.btnAddPV?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  doCreatePV();
});
els.btnSaveSelected?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  saveSelected();
});
els.btnDeleteSelected?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  deleteSelected();
});

// Dashboard
els.btnDashboard?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  openDash();
});
els.btnDashClose?.addEventListener("click", (e) => {
  clickFX(e.currentTarget);
  closeDash();
});
els.btnDashLoad?.addEventListener("click", async (e) => {
  clickFX(e.currentTarget);
  await loadDashboardGlobal();
});
els.btnDashRefresh?.addEventListener("click", async (e) => {
  clickFX(e.currentTarget);
  await loadDashboardGlobal();
});

document.addEventListener("keydown", (e) => {
  if (!els.dashModal) return;
  if (!els.dashModal.classList.contains("hidden") && e.key === "Escape")
    closeDash();
});

// -------- Dep drag scroll --------
function initDepScroller() {
  const wrap = els.depScrollWrap;
  if (!wrap) return;

  const btnL = els.depScrollLeft;
  const btnR = els.depScrollRight;

  const updateArrows = () => {
    if (!btnL || !btnR) return;
    const max = wrap.scrollWidth - wrap.clientWidth;
    const x = wrap.scrollLeft;
    btnL.disabled = x <= 2;
    btnR.disabled = x >= max - 2;
  };

  const scrollByAmount = (dir) => {
    const amt = Math.max(220, Math.floor(wrap.clientWidth * 0.75));
    wrap.scrollBy({ left: dir * amt, behavior: "smooth" });
  };
  btnL?.addEventListener("click", (e) => {
    clickFX(e.currentTarget);
    scrollByAmount(-1);
  });
  btnR?.addEventListener("click", (e) => {
    clickFX(e.currentTarget);
    scrollByAmount(1);
  });

  let isDown = false;
  let startX = 0;
  let startLeft = 0;

  const onDown = (e) => {
    // ✅ Si el usuario está haciendo click en un chip, NO interceptar
    if (e.target.closest("button.chip")) return;

    if (e.pointerType === "mouse" && e.button !== 0) return;

    isDown = true;
    wrap.classList.add("is-dragging");
    startX = e.clientX;
    startLeft = wrap.scrollLeft;

    // ✅ solo capturar si es drag del contenedor (no sobre botones)
    wrap.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    wrap.scrollLeft = startLeft - dx;
    e.preventDefault();
    updateArrows();
  };

  const end = () => {
    if (!isDown) return;
    isDown = false;
    wrap.classList.remove("is-dragging");
    updateArrows();
  };

  // ✅ IMPORTANT: pointerdown NO passive, para evitar comportamientos raros PC
  wrap.addEventListener("pointerdown", onDown, { passive: false, capture: true });
  wrap.addEventListener("pointermove", onMove, { passive: false });
  wrap.addEventListener("pointerup", end);
  wrap.addEventListener("pointercancel", end);
  wrap.addEventListener("mouseleave", end);

  wrap.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  requestAnimationFrame(updateArrows);
}

// ---------- INIT ----------
(async function init() {
  showLoading("Cargando PV…");
  try {
    await loadMeta(); // ✅ ahora desde Departamentos_list / Municipio_list
    await loadAll();
    await loadActiveShifts();

    loadFilters();

    // después de cargar filtros guardados, refresca dropdowns con munis correctos
    renderDropdowns();
    renderAll();
    initDepScroller();
  } finally {
    hideLoading();
  }

  // refresco ligero (solo turnos/lista). NO dashboard global
  setInterval(async () => {
    await loadActiveShifts();
    renderList();
    if (state.selectedPV) renderEditor();
  }, 60000);
})();
