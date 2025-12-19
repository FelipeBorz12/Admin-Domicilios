"use strict";

/* ==========================
   CONFIG
   ========================== */
const API = {
  list: "/api/admin/menu", // GET  -> { ok:true, items:[...] }
  create: "/api/admin/menu", // POST -> { ok:true, item:{...} }
  update: (id) => `/api/admin/menu/${id}`, // PUT  -> { ok:true }
  remove: (id) => `/api/admin/menu/${id}`, // DELETE -> { ok:true }

  // categorías (tipo)
  deleteType: (tipo) => `/api/admin/menu/type/${tipo}`, // DELETE -> { ok:true }

  uploadImage: "/api/admin/upload-image", // POST FormData -> { ok:true, publicUrl }
  deleteImage: "/api/admin/delete-image",
};

const FALLBACK_IMG = "/img/mensaje-error.png";

const DEFAULT_TYPES = {
  1: "Hamburguesas",
  2: "Adiciones",
  3: "Combos",
  4: "Papas",
  6: "Bebidas",
};
const TYPE_STORE_KEY = "tq_menu_type_names_v1";

/* ==========================
   HELPERS
   ========================== */
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

  // si body es objeto normal, lo enviamos como JSON
  if (o.body && typeof o.body === "object" && !(o.body instanceof FormData)) {
    o.headers["Content-Type"] = "application/json";
    o.body = JSON.stringify(o.body);
  }

  const r = await fetch(url, o);

  // ojo: cuando hay 404, express te puede devolver HTML
  const ct = (r.headers.get("content-type") || "").toLowerCase();
  let data = {};
  if (ct.includes("application/json")) {
    data = await r.json().catch(() => ({}));
  } else {
    const text = await r.text().catch(() => "");
    data = { ok: false, error: text || `HTTP ${r.status}` };
  }

  if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

function isDeletableImageUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (u === FALLBACK_IMG) return false;
  // evita borrar placeholders o rutas locales
  if (u.startsWith("/") || u.startsWith("http://localhost")) return false;
  return true;
}

// Intenta borrar por varios formatos (para que funcione aunque tu backend espere otra key)
async function deleteImageByUrl(publicUrl) {
  if (!isDeletableImageUrl(publicUrl)) return { ok: true, skipped: true };

  const attempts = [
    { method: "POST", body: { publicUrl } },
    { method: "POST", body: { url: publicUrl } },
    { method: "POST", body: { imagen: publicUrl } },
    // por si tu backend usa DELETE con body
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
  return {
    ok: false,
    error: lastErr?.message || "No se pudo borrar la imagen",
  };
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

/* ==========================
   MODAL UI
   ========================== */
const els = {
  uiModal: q("uiModal"),
  uiModalIconWrap: q("uiModalIconWrap"),
  uiModalIcon: q("uiModalIcon"),
  uiModalTitle: q("uiModalTitle"),
  uiModalDesc: q("uiModalDesc"),
  uiModalBody: q("uiModalBody"),
  uiModalActions: q("uiModalActions"),

  typeChips: q("typeChips"),
  typeHint: q("typeHint"),
  countText: q("countText"),
  qSearch: q("qSearch"),
  qType: q("qType"),
  qActive: q("qActive"),
  btnReset: q("btnReset"),
  btnReload: q("btnReload"),
  btnAddType: q("btnAddType"),
  btnAddProduct: q("btnAddProduct"),

  productList: q("productList"),
  listCount: q("listCount"),

  editorWrap: q("editorWrap"),
  selectedMeta: q("selectedMeta"),
  dirtyBadge: q("dirtyBadge"),

  btnSaveSelected: q("btnSaveSelected"),
  btnDeleteSelected: q("btnDeleteSelected"),

  btnDeleteCategory: q("btnDeleteCategory"), // opcional
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
      "rounded-full px-5 py-2.5 text-sm font-extrabold transition border";

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

function modalErrorFriendly(err, context) {
  console.error("[inventory][error]", context || "", err);
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

/* ========= modalForm (soluciona “no me pide datos”) ========= */
function modalForm({
  title = "Formulario",
  desc = "",
  tone = "info",
  icon = "edit",
  confirmText = "Guardar",
  cancelText = "Cancelar",
  fields = [], // [{name,label,type,placeholder,value,required,options,rows,hint}]
}) {
  return new Promise((resolve) => {
    if (!hasModalUI()) return resolve(null);

    openModal({
      title,
      desc,
      tone,
      icon,
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
          variant: tone === "danger" ? "danger" : "primary",
          onClick: async () => {
            // validar
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
            // recolectar
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

      if (f.type === "select") {
        input = document.createElement("select");
        input.className = "field-select";
        (f.options || []).forEach((opt) => {
          const o = document.createElement("option");
          o.value = String(opt.value);
          o.textContent = opt.label;
          if (String(f.value ?? "") === String(opt.value)) o.selected = true;
          input.appendChild(o);
        });
      } else if (f.type === "textarea") {
        input = document.createElement("textarea");
        input.className = "field-textarea";
        input.rows = Number(f.rows || 4);
        input.value = String(f.value ?? "");
        if (f.placeholder) input.placeholder = f.placeholder;
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

        // ✅ mejora para números
        if (input.type === "number") {
          input.inputMode = "numeric";
          input.step = "1";
          input.addEventListener("focus", () => input.select());
        } else {
          input.addEventListener("focus", () => input.select());
        }
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

/* ==========================
   SINGLE STATE (sin duplicados)
   ========================== */
function loadTypeNames() {
  try {
    const raw = localStorage.getItem(TYPE_STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { ...DEFAULT_TYPES, ...(parsed || {}) };
  } catch {
    return { ...DEFAULT_TYPES };
  }
}
function saveTypeNames() {
  localStorage.setItem(TYPE_STORE_KEY, JSON.stringify(state.typeNames));
}

const state = (window.__INV_STATE__ = window.__INV_STATE__ || {
  products: [], // normalizados
  selectedType: "all", // "all" o "1"
  selectedProductId: null, // id
  draftById: new Map(), // id -> draft
  dirtyIds: new Set(), // ids con cambios
  typeNames: loadTypeNames(), // labels de tipos
});

function setDirtyBadge() {
  els.dirtyBadge?.classList?.toggle?.("hidden", state.dirtyIds.size === 0);
}

function typeLabel(n) {
  const k = String(n);
  return state.typeNames[k] || `Tipo ${k}`;
}

function normalizeProduct(p) {
  return {
    id: Number(p.id),
    Nombre: String(p.Nombre ?? ""),
    Descripcion: String(p.Descripcion ?? ""),
    PrecioOriente: Number(p.PrecioOriente ?? 0),
    PrecioAreaMetrop: Number(p.PrecioAreaMetrop ?? 0),
    PrecioRestoPais: Number(p.PrecioRestoPais ?? 0),
    Cantidad: Number(p.Cantidad ?? 0),
    tipo: Number(p.tipo ?? 1),
    Activo: Number(p.Activo ?? 0),
    imagen: String(p.imagen ?? ""),
  };
}

function getEffectiveProduct(id) {
  const key = Number(id);
  if (state.draftById.has(key)) return state.draftById.get(key);
  return state.products.find((x) => Number(x.id) === key) || null;
}

function setDraft(id, nextObj) {
  const key = Number(id);
  state.draftById.set(key, nextObj);
  state.dirtyIds.add(key);
  setDirtyBadge();
  renderTypeChips();
  renderProductList();
}

function clearDraft(id) {
  const key = Number(id);
  state.draftById.delete(key);
  state.dirtyIds.delete(key);
  setDirtyBadge();
  renderTypeChips();
  renderProductList();
}

/* ==========================
   FILTERS
   ========================== */
function getFilters() {
  const search = String(els.qSearch?.value || "")
    .trim()
    .toLowerCase();
  const active = String(els.qActive?.value || "all");
  const t = String(els.qType?.value || "all");
  return { search, active, type: t };
}

function filteredItems() {
  const { search, active, type } = getFilters();
  return state.products
    .filter((p) => {
      if (type !== "all" && String(p.tipo) !== String(type)) return false;
      if (
        state.selectedType !== "all" &&
        String(p.tipo) !== String(state.selectedType)
      )
        return false;
      if (active !== "all" && String(p.Activo) !== String(active)) return false;
      if (search) {
        const hay = `${p.Nombre} ${p.Descripcion} ${p.id}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) =>
      a.Nombre.localeCompare(b.Nombre, "es", { sensitivity: "base" })
    );
}

function countsByType() {
  const map = {};
  state.products.forEach((p) => {
    const k = String(p.tipo);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

/* ==========================
   UI RENDER
   ========================== */
function renderTypeDropdown() {
  if (!els.qType) return;
  const current = String(els.qType.value || "all");
  const keys = Object.keys(state.typeNames).sort(
    (a, b) => Number(a) - Number(b)
  );

  els.qType.innerHTML =
    `<option value="all">Todos</option>` +
    keys
      .map(
        (k) =>
          `<option value="${escapeHtml(k)}">${escapeHtml(
            typeLabel(k)
          )} (tipo=${k})</option>`
      )
      .join("");

  els.qType.value = keys.includes(current) ? current : "all";
}

function renderTypeChips() {
  if (!els.typeChips) return;
  const counts = countsByType();
  const keys = Object.keys(state.typeNames).sort(
    (a, b) => Number(a) - Number(b)
  );

  els.typeChips.innerHTML = "";

  // chip "Todos"
  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className =
    "chip" + (state.selectedType === "all" ? " chip--active" : "");
  allChip.innerHTML = `
    <span class="material-symbols-outlined text-[18px]">apps</span>
    Todos
    <span class="chip-badge">${state.products.length}</span>
  `;
  allChip.addEventListener("click", () => trySwitchType("all"));
  els.typeChips.appendChild(allChip);

  keys.forEach((k) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      "chip" +
      (String(state.selectedType) === String(k) ? " chip--active" : "");
    chip.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">category</span>
      ${escapeHtml(typeLabel(k))}
      <span class="chip-badge">${counts[k] || 0}</span>
    `;
    chip.addEventListener("click", () => trySwitchType(k));
    els.typeChips.appendChild(chip);
  });

  if (els.typeHint) {
    els.typeHint.textContent =
      state.selectedType === "all"
        ? "Mostrando todos los tipos. Puedes filtrar más con Buscar/Activo."
        : `Mostrando: ${typeLabel(state.selectedType)} (tipo=${
            state.selectedType
          })`;
  }

  if (els.countText) {
    els.countText.textContent = `${filteredItems().length} / ${
      state.products.length
    } productos`;
  }
}

function renderProductList() {
  if (!els.productList) return;
  const list = filteredItems();
  if (els.listCount) els.listCount.textContent = `${list.length}`;
  els.productList.innerHTML = "";

  if (list.length === 0) {
    els.productList.innerHTML = `<div class="text-sm text-slate-600 dark:text-slate-300">No hay productos para estos filtros.</div>`;
    return;
  }

  list.forEach((p) => {
    const isSel = Number(state.selectedProductId) === Number(p.id);
    const isDirty = state.dirtyIds.has(Number(p.id));

    const row = document.createElement("div");
    row.className = "list-item" + (isSel ? " list-item--active" : "");
    row.innerHTML = `
      <div class="min-w-0">
        <div class="mini-title truncate">${escapeHtml(p.Nombre || "—")}</div>
        <div class="mini-muted mt-0.5">
          ID: ${p.id} • ${escapeHtml(typeLabel(p.tipo))} • ${
      p.Activo ? "Activo" : "Inactivo"
    }
          ${isDirty ? " • ✳️ Editado" : ""}
        </div>
      </div>
      <div class="mini-muted">${p.PrecioRestoPais || 0}</div>
    `;
    row.addEventListener("click", () => trySelectProduct(p.id));
    els.productList.appendChild(row);
  });
}

function renderEditor() {
  if (!els.editorWrap) return;

  const p = state.selectedProductId
    ? getEffectiveProduct(state.selectedProductId)
    : null;
  if (!p) {
    if (els.selectedMeta) els.selectedMeta.textContent = "—";
    els.editorWrap.innerHTML = `<div class="text-sm text-slate-600 dark:text-slate-300">Selecciona un producto para editarlo.</div>`;
    return;
  }

  if (els.selectedMeta) {
    els.selectedMeta.textContent = `ID: ${p.id} • ${typeLabel(p.tipo)} • ${
      p.Activo ? "Activo" : "Inactivo"
    }`;
  }

  const imgUrl = (p.imagen || "").trim() || FALLBACK_IMG;

  els.editorWrap.innerHTML = `
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs font-extrabold text-slate-500 dark:text-slate-400">Producto</div>
          <div class="text-sm font-extrabold text-slate-900 dark:text-white truncate">${escapeHtml(
            p.Nombre || "—"
          )}</div>
        </div>

        <div class="flex items-center gap-2">
          <button id="btnUploadImg" class="rounded-full px-4 py-2 text-sm font-extrabold btn-soft border border-slate-200 dark:border-slate-700 transition" type="button">
            <span class="material-symbols-outlined text-[18px] align-[-3px]">upload</span>
            Imagen
          </button>

          <button id="btnSaveCard" class="rounded-full px-4 py-2 text-sm font-extrabold btn-primary transition" type="button">
            Guardar
          </button>

          <button id="btnDeleteCard" class="rounded-full px-4 py-2 text-sm font-extrabold bg-rose-600 text-white hover:bg-rose-700 transition" type="button">
            Eliminar
          </button>
        </div>
      </div>

      <div class="p-4 grid gap-4">
        <div class="flex items-start gap-3">
          <div class="img-thumb">
            <img id="pvImg" src="${escapeHtml(imgUrl)}" alt="Imagen producto">
          </div>
          <div class="min-w-0">
            <div class="text-xs font-extrabold text-slate-500 dark:text-slate-400">Imagen (URL)</div>
            <input id="f_imagen" class="field-input mt-1" type="text" value="${escapeHtml(
              p.imagen || ""
            )}" placeholder="Se llena al subir imagen" />
            <div class="field-hint mt-1">Al subir imagen se llena solo el URL. Folder: <b>imagen_productos/productosimage</b>.</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="field">
            <span class="field-label">Nombre</span>
            <input id="f_nombre" class="field-input" type="text" value="${escapeHtml(
              p.Nombre
            )}" />
          </label>

          <label class="field">
            <span class="field-label">Tipo (categoría)</span>
            <input id="f_tipo" class="field-input" type="number" inputmode="numeric" step="1" value="${Number(
              p.tipo
            )}" />
          </label>
        </div>

        <label class="field">
          <span class="field-label">Descripción</span>
          <textarea id="f_desc" class="field-textarea" rows="4">${escapeHtml(
            p.Descripcion
          )}</textarea>
        </label>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <label class="field">
            <span class="field-label">Precio Oriente</span>
            <input id="f_po" class="field-input" type="number" inputmode="numeric" step="1" value="${Number(
              p.PrecioOriente
            )}" />
          </label>

          <label class="field">
            <span class="field-label">Precio Área Metrop</span>
            <input id="f_pm" class="field-input" type="number" inputmode="numeric" step="1" value="${Number(
              p.PrecioAreaMetrop
            )}" />
          </label>

          <label class="field">
            <span class="field-label">Precio Resto País</span>
            <input id="f_pr" class="field-input" type="number" inputmode="numeric" step="1" value="${Number(
              p.PrecioRestoPais
            )}" />
          </label>

          <label class="field">
            <span class="field-label">Cantidad</span>
            <input id="f_cant" class="field-input" type="number" inputmode="numeric" step="1" value="${Number(
              p.Cantidad
            )}" />
          </label>
        </div>

        <label class="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">
          <input id="f_activo" type="checkbox" ${
            Number(p.Activo) === 1 ? "checked" : ""
          }>
          Activo
        </label>

        <div class="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Tip: cambiar de producto con cambios sin guardar abrirá un modal.
        </div>
      </div>
    </div>
  `;

  const imgEl = q("pvImg");
  if (imgEl)
    imgEl.onerror = () => {
      imgEl.src = FALLBACK_IMG;
    };

  // bind: input + change + keyup (para números)
  const bind = (id) => {
    const el = q(id);
    if (!el) return;
    el.addEventListener("input", commitEditorChange);
    el.addEventListener("change", commitEditorChange);
    el.addEventListener("keyup", commitEditorChange);
    el.addEventListener("focus", () => {
      try {
        el.select?.();
      } catch {}
    });
  };
  [
    "f_imagen",
    "f_nombre",
    "f_tipo",
    "f_desc",
    "f_po",
    "f_pm",
    "f_pr",
    "f_cant",
    "f_activo",
  ].forEach(bind);

  q("btnUploadImg")?.addEventListener("click", uploadImageForSelected);
  q("btnSaveCard")?.addEventListener("click", saveSelected);
  q("btnDeleteCard")?.addEventListener("click", deleteSelected);
}

function commitEditorChange() {
  const id = state.selectedProductId;
  if (!id) return;

  const base = getEffectiveProduct(id);
  if (!base) return;

  const next = { ...base };
  next.imagen = String(q("f_imagen")?.value || "");
  next.Nombre = String(q("f_nombre")?.value || "");
  next.tipo = Number(q("f_tipo")?.value || 1);
  next.Descripcion = String(q("f_desc")?.value || "");
  next.PrecioOriente = Number(q("f_po")?.value || 0);
  next.PrecioAreaMetrop = Number(q("f_pm")?.value || 0);
  next.PrecioRestoPais = Number(q("f_pr")?.value || 0);
  next.Cantidad = Number(q("f_cant")?.value || 0);
  next.Activo = q("f_activo")?.checked ? 1 : 0;

  setDraft(id, next);

  const imgEl = q("pvImg");
  if (imgEl) imgEl.src = next.imagen?.trim() || FALLBACK_IMG;
}

/* ==========================
   NAV WITH UNSAVED
   ========================== */
async function trySelectProduct(id) {
  const nextId = Number(id);
  if (Number(state.selectedProductId) === nextId) return;

  if (
    state.selectedProductId &&
    state.dirtyIds.has(Number(state.selectedProductId))
  ) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Si cambias de producto, se descartarán los cambios del producto actual.",
      confirmText: "Descartar y cambiar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    clearDraft(state.selectedProductId);
  }

  state.selectedProductId = nextId;
  renderAll();
}

async function trySwitchType(nextType) {
  const nt = String(nextType);
  if (String(state.selectedType) === nt) return;

  if (
    state.selectedProductId &&
    state.dirtyIds.has(Number(state.selectedProductId))
  ) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Cambiar el tipo puede ocultar el producto actual. ¿Deseas descartar los cambios?",
      confirmText: "Descartar y cambiar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    clearDraft(state.selectedProductId);
  }

  state.selectedType = nt;

  const visibleIds = new Set(filteredItems().map((x) => Number(x.id)));
  if (
    state.selectedProductId &&
    !visibleIds.has(Number(state.selectedProductId))
  ) {
    state.selectedProductId = null;
  }

  renderAll();
}

window.addEventListener("beforeunload", (e) => {
  if (state.dirtyIds.size > 0) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ==========================
   IMAGE UPLOAD
   ========================== */
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
  if (!state.selectedProductId) {
    modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un producto primero.",
    });
    return;
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
    fd.append("scope", "imagen_productos");
    fd.append("recordKey", `menu-id-${state.selectedProductId}`); // ✅ esto explica por qué ves carpeta menu-id-25
    fd.append("slot", "productosimage");

    const data = await apiJSON(API.uploadImage, { method: "POST", body: fd });
    const publicUrl = data.publicUrl;

    const imgInput = q("f_imagen");
    if (imgInput) imgInput.value = publicUrl;

    commitEditorChange();
    hideLoading();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Imagen subida",
      desc: "La URL se agregó. Recuerda guardar.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Subida de imagen");
  }
}

/* ==========================
   CRUD
   ========================== */
async function loadAll() {
  showLoading("Cargando productos…");
  try {
    const data = await apiJSON(API.list);
    const raw = Array.isArray(data.items) ? data.items : [];
    state.products = raw.map(normalizeProduct);

    // si el seleccionado ya no existe, limpiar
    if (state.selectedProductId) {
      const still = state.products.some(
        (p) => Number(p.id) === Number(state.selectedProductId)
      );
      if (!still) state.selectedProductId = null;
    }

    hideLoading();
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Cargando menú");
  }
}

async function doCreateProduct() {
  try {
    const defaultTipo =
      state.selectedType !== "all" ? Number(state.selectedType) : 1;

    const values = await modalForm({
      title: "Crear producto",
      desc: "Nombre y descripción son obligatorios.",
      confirmText: "Crear",
      fields: [
        {
          name: "Nombre",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "Hamburguesa...",
        },
        {
          name: "Descripcion",
          label: "Descripción",
          type: "textarea",
          required: true,
          placeholder: "Describe el producto...",
        },
        {
          name: "tipo",
          label: "Tipo (categoría)",
          type: "number",
          required: true,
          value: defaultTipo,
        },
        { name: "Activo", label: "Activo", type: "checkbox", value: true },
      ],
    });
    if (!values) return;

    const payload = {
      Nombre: String(values.Nombre || "").trim(),
      Descripcion: String(values.Descripcion || "").trim(),
      tipo: Number(values.tipo || defaultTipo),
      Activo: values.Activo ? 1 : 0,
      PrecioOriente: 0,
      PrecioAreaMetrop: 0,
      PrecioRestoPais: 0,
      Cantidad: 0,
      imagen: "",
    };

    // validación extra (por si acaso)
    if (!payload.Nombre)
      return modalAlert({
        tone: "danger",
        icon: "error",
        title: "Falta el nombre",
        desc: "Debes escribir el nombre.",
      });
    if (!payload.Descripcion)
      return modalAlert({
        tone: "danger",
        icon: "error",
        title: "Falta la descripción",
        desc: "Debes escribir la descripción.",
      });

    showLoading("Creando producto…");
    const created = await apiJSON(API.create, {
      method: "POST",
      body: payload,
    });
    hideLoading();

    await loadAll();

    // intentar seleccionar el nuevo si el backend lo devuelve
    const newId =
      created?.item?.id ?? created?.row?.id ?? created?.product?.id ?? null;
    if (newId) state.selectedProductId = Number(newId);

    state.selectedType = String(payload.tipo);
    renderAll();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Producto creado",
      desc: "Ya puedes editarlo y guardar.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Creando producto");
  }
}

async function saveSelected() {
  const id = state.selectedProductId;
  if (!id)
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un producto primero.",
    });

  // ✅ clave: commit antes de revisar dirtyIds
  commitEditorChange();

  const p = getEffectiveProduct(id);
  if (!p) return;

  if (!state.dirtyIds.has(Number(id))) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin cambios",
      desc: "Este producto no tiene cambios pendientes.",
    });
  }

  if (!String(p.Nombre || "").trim()) {
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Nombre obligatorio",
      desc: "El producto debe tener un nombre.",
    });
  }
  if (!String(p.Descripcion || "").trim()) {
    return modalAlert({
      tone: "danger",
      icon: "error",
      title: "Descripción obligatoria",
      desc: "El producto debe tener una descripción.",
    });
  }

  showLoading("Guardando…");
  try {
    await apiJSON(API.update(p.id), { method: "PUT", body: p });
    hideLoading();

    // aplica draft a base y limpia draft
    state.products = state.products.map((x) =>
      Number(x.id) === Number(p.id) ? normalizeProduct(p) : x
    );
    clearDraft(p.id);

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Guardado",
      desc: "Los cambios se guardaron.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Guardando producto");
  }
}

async function deleteSelected() {
  const id = state.selectedProductId;
  if (!id) {
    return modalAlert({
      tone: "info",
      icon: "info",
      title: "Sin selección",
      desc: "Selecciona un producto primero.",
    });
  }

  const p = getEffectiveProduct(id);
  if (!p) return;

  const imageUrl = String(p.imagen || "").trim();

  const ok = await modalConfirm({
    tone: "danger",
    icon: "delete",
    title: "Eliminar producto",
    desc: `Se eliminará "${p.Nombre}" (ID ${p.id}). También intentaremos borrar su imagen del bucket. Esta acción no se puede deshacer.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  });
  if (!ok) return;

  showLoading("Eliminando producto…");
  try {
    // 1) borrar producto en DB
    await apiJSON(API.remove(p.id), { method: "DELETE" });

    // 2) borrar imagen del bucket (mejor esfuerzo)
    const imgRes = await deleteImageByUrl(imageUrl);

    hideLoading();

    // 3) limpiar estado/UI
    state.products = state.products.filter(
      (x) => Number(x.id) !== Number(p.id)
    );
    clearDraft(p.id);
    state.selectedProductId = null;

    renderAll();

    if (imgRes.skipped) {
      return modalAlert({
        tone: "success",
        icon: "check_circle",
        title: "Eliminado",
        desc: "El producto fue eliminado. No había una imagen válida para borrar.",
      });
    }

    if (!imgRes.ok) {
      return modalAlert({
        tone: "info",
        icon: "warning",
        title: "Producto eliminado",
        desc: `El producto se borró, pero la imagen pudo no borrarse del bucket.\nDetalle: ${imgRes.error}`,
      });
    }

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Eliminado",
      desc: "El producto y su imagen fueron eliminados.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Eliminando producto");
  }
}

/* ========= DELETE CATEGORY (tipo) ========= */
async function deleteCategoryByTipo(tipo) {
  const t = Number(tipo);
  if (!Number.isFinite(t) || t <= 0) {
    modalAlert({
      tone: "info",
      icon: "info",
      title: "Selecciona una categoría",
      desc: "Primero selecciona un tipo válido.",
    });
    return;
  }

  const count = state.products.filter((p) => Number(p.tipo) === t).length;

  const ok = await modalConfirm({
    tone: "danger",
    icon: "warning",
    title: "Eliminar categoría",
    desc:
      count > 0
        ? `Se eliminará la categoría tipo=${t} y también ${count} producto(s) asociados. Esta acción no se puede deshacer.`
        : `Se eliminará la categoría tipo=${t}. No hay productos asociados.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
  });
  if (!ok) return;

  const imgsToDelete = state.products
    .filter((p) => Number(p.tipo) === t)
    .map((p) => String(p.imagen || "").trim())
    .filter(isDeletableImageUrl);

  showLoading("Eliminando categoría…");
  try {
    await apiJSON(API.deleteType(t), { method: "DELETE" });
    hideLoading();

    // limpia productos local
    state.products = state.products.filter((p) => Number(p.tipo) !== t);
    for (const url of imgsToDelete) {
      // mejor esfuerzo, no rompas toda la eliminación por una imagen
      await deleteImageByUrl(url).catch(() => {});
    }

    // limpia drafts/dirty
    for (const [id, prod] of Array.from(state.draftById.entries())) {
      if (Number(prod.tipo) === t) state.draftById.delete(id);
    }
    for (const id of Array.from(state.dirtyIds)) {
      const still = state.products.some((p) => Number(p.id) === Number(id));
      if (!still) state.dirtyIds.delete(id);
    }

    // elimina el label del tipo (para que NO siga apareciendo la barra)
    delete state.typeNames[String(t)];
    saveTypeNames();

    // limpia selección
    if (String(state.selectedType) === String(t)) state.selectedType = "all";
    state.selectedProductId = null;

    renderAll();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Categoría eliminada",
      desc:
        count > 0
          ? "Se borraron los productos asociados."
          : "No había productos asociados.",
    });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, "Eliminando categoría");
  }
}

/* ==========================
   TYPES (labels)
   ========================== */
async function addType() {
  try {
    const data = await modalForm({
      title: "Agregar / renombrar tipo",
      desc: "Define el número y el nombre.",
      confirmText: "Guardar",
      fields: [
        {
          name: "num",
          label: "Número de tipo",
          type: "number",
          required: true,
          placeholder: "5",
        },
        {
          name: "name",
          label: "Nombre",
          type: "text",
          required: true,
          placeholder: "Postres",
        },
      ],
    });
    if (!data) return;

    const num = Number(data.num);
    const name = String(data.name || "").trim();

    if (!Number.isFinite(num) || num <= 0) {
      return modalAlert({
        tone: "danger",
        icon: "error",
        title: "Número inválido",
        desc: "Escribe un número de tipo válido (>0).",
      });
    }
    if (!name) {
      return modalAlert({
        tone: "danger",
        icon: "error",
        title: "Nombre requerido",
        desc: "Escribe el nombre del tipo.",
      });
    }

    state.typeNames[String(num)] = name;
    saveTypeNames();
    renderAll();

    modalAlert({
      tone: "success",
      icon: "check_circle",
      title: "Tipo guardado",
      desc: "La etiqueta quedó disponible en la barra superior.",
    });
  } catch (e) {
    modalErrorFriendly(e, "Agregando tipo");
  }
}

/* ==========================
   RESET & RENDER
   ========================== */
function resetFilters() {
  if (els.qSearch) els.qSearch.value = "";
  if (els.qActive) els.qActive.value = "all";
  if (els.qType) els.qType.value = "all";
  state.selectedType = "all";
  renderAll();
}

function renderAll() {
  renderTypeDropdown();
  renderTypeChips();
  renderProductList();
  renderEditor();
  setDirtyBadge();
}

/* ==========================
   WIRE UI
   ========================== */
els.qSearch?.addEventListener("input", renderAll);
els.qActive?.addEventListener("change", renderAll);
els.qType?.addEventListener("change", (e) => trySwitchType(e.target.value));

els.btnReset?.addEventListener("click", resetFilters);

els.btnReload?.addEventListener("click", async () => {
  if (state.dirtyIds.size > 0) {
    const ok = await modalConfirm({
      tone: "info",
      icon: "warning",
      title: "Tienes cambios sin guardar",
      desc: "Recargar traerá datos frescos y descartará cambios no guardados. ¿Continuar?",
      confirmText: "Sí, recargar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    state.draftById.clear();
    state.dirtyIds.clear();
    setDirtyBadge();
  }
  await loadAll();
  renderAll();
});

els.btnAddType?.addEventListener("click", addType);
els.btnAddProduct?.addEventListener("click", doCreateProduct);

els.btnSaveSelected?.addEventListener("click", saveSelected);
els.btnDeleteSelected?.addEventListener("click", deleteSelected);

els.btnDeleteCategory?.addEventListener("click", async () => {
  const tipo =
    state.selectedType !== "all"
      ? Number(state.selectedType)
      : Number(els.qType?.value || 0);
  await deleteCategoryByTipo(tipo);
});

/* ==========================
   INIT
   ========================== */
(async function init() {
  await loadAll();
  renderAll();
})();
