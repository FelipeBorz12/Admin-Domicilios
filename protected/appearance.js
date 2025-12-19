'use strict';

const API = {
  aboutGet: '/api/admin/landing/about',
  aboutPut: '/api/admin/landing/about',
  instaGet: '/api/admin/landing/instagram',
  instaPut: '/api/admin/landing/instagram',
  heroGet: '/api/admin/landing/hero',
  heroPut: '/api/admin/landing/hero',
  uploadImage: '/api/admin/upload-image',
  deleteImage: '/api/admin/delete-image',
};

const DRAFT_KEY = 'tq_appearance_draft_v4';

// ✅ Imagen por defecto cuando NO hay URL (o se borra del bucket)
const ERROR_IMG = '/img/mensaje-error.png';

// ✅ helpers
function q(id) { return document.getElementById(id); }
function bind(el, ev, fn, name) {
  if (!el) {
    console.warn(`[appearance] Falta #${name || '(sin nombre)'} en HTML, se omite listener.`);
    return;
  }
  el.addEventListener(ev, fn);
}

function imgOrError(url) {
  const u = String(url || '').trim();
  return u ? u : ERROR_IMG;
}

const els = {
  tabHero: q('tabHero'),
  tabAbout: q('tabAbout'),
  tabInstagram: q('tabInstagram'),
  panelHero: q('panelHero'),
  panelAbout: q('panelAbout'),
  panelInstagram: q('panelInstagram'),

  btnLoad: q('btnLoad'),
  btnSaveDraft: q('btnSaveDraft'),
  btnPublish: q('btnPublish'),
  draftBadge: q('draftBadge'),

  loadingOverlay: q('loadingOverlay'),

  // HERO editor
  heroList: q('heroList'),
  btnAddHero: q('btnAddHero'),

  // About inputs
  about_title: q('about_title'),
  about_tagline: q('about_tagline'),
  about_badge_text: q('about_badge_text'),
  about_image_url: q('about_image_url'),
  about_body: q('about_body'),
  about_cta_text: q('about_cta_text'),
  about_cta_href: q('about_cta_href'),
  about_instagram_handle: q('about_instagram_handle'),
  btnUploadAbout: q('btnUploadAbout'),
  btnDeleteAboutImage: q('btnDeleteAboutImage'),

  // Instagram editor
  instaList: q('instaList'),
  btnAddInsta: q('btnAddInsta'),

  // Preview HERO
  pv_hero_img: q('pv_hero_img'),
  pv_hero_tag: q('pv_hero_tag'),
  pv_hero_title: q('pv_hero_title'),
  pv_hero_desc: q('pv_hero_desc'),
  pv_hero_prev: q('pv_hero_prev'),
  pv_hero_next: q('pv_hero_next'),
  pv_hero_dots: q('pv_hero_dots'),

  // Preview ABOUT/IG
  pv_about_img: q('pv_about_img'),
  pv_badge_wrap: q('pv_badge_wrap'),
  pv_badge_text: q('pv_badge_text'),
  pv_tagline: q('pv_tagline'),
  pv_title: q('pv_title'),
  pv_body: q('pv_body'),
  pv_cta: q('pv_cta'),
  pv_cta_text: q('pv_cta_text'),
  pv_ig: q('pv_ig'),
  pv_ig2: q('pv_ig2'),
  pv_insta_grid: q('pv_insta_grid'),

  // Modal genérico
  uiModal: q('uiModal'),
  uiModalIconWrap: q('uiModalIconWrap'),
  uiModalIcon: q('uiModalIcon'),
  uiModalTitle: q('uiModalTitle'),
  uiModalDesc: q('uiModalDesc'),
  uiModalActions: q('uiModalActions'),
};

let state = {
  hero: [],
  about: {
    id: null,
    title: '',
    tagline: '',
    badge_text: '',
    image_url: '',
    body: '',
    cta_text: 'Pide aquí',
    cta_href: '/stores',
    instagram_handle: '@tierraquerida20',
  },
  instagram: [],
  usingDraft: false,
};

let heroIndex = 0;

// ---------------- UI helpers ----------------
function showLoading(text) {
  const t = els.loadingOverlay?.querySelector?.('.loading-text');
  if (t) t.textContent = text || 'Procesando…';
  els.loadingOverlay?.classList?.remove?.('hidden');
  document.body.style.overflow = 'hidden';
}
function hideLoading() {
  els.loadingOverlay?.classList?.add?.('hidden');
  document.body.style.overflow = '';
}

// ---------------- Modal helpers ----------------
function hasModalUI() {
  return !!(els.uiModal && els.uiModalTitle && els.uiModalDesc && els.uiModalActions && els.uiModalIconWrap && els.uiModalIcon);
}

function openModal({ icon = 'info', tone = 'info', title, desc, actions }) {
  if (!hasModalUI()) {
    console.warn('[appearance] Modal UI no existe en HTML. Mensaje:', title, desc);
    return;
  }

  els.uiModalIcon.textContent = icon;
  els.uiModalTitle.textContent = title || '';
  els.uiModalDesc.textContent = desc || '';
  els.uiModalActions.innerHTML = '';

  const wrap = els.uiModalIconWrap;
  wrap.className = 'mt-0.5 h-10 w-10 rounded-xl border grid place-items-center';

  if (tone === 'danger') {
    wrap.classList.add('bg-rose-50', 'border-rose-100', 'dark:bg-rose-900/25', 'dark:border-rose-900/40');
    els.uiModalIcon.className = 'material-symbols-outlined text-[22px] text-rose-600 dark:text-rose-300';
  } else if (tone === 'success') {
    wrap.classList.add('bg-emerald-50', 'border-emerald-100', 'dark:bg-emerald-900/25', 'dark:border-emerald-900/40');
    els.uiModalIcon.className = 'material-symbols-outlined text-[22px] text-emerald-600 dark:text-emerald-300';
  } else {
    wrap.classList.add('bg-slate-100', 'border-slate-200', 'dark:bg-slate-800', 'dark:border-slate-700');
    els.uiModalIcon.className = 'material-symbols-outlined text-[22px] text-slate-700 dark:text-slate-200';
  }

  (actions || []).forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = a.label;
    btn.className = 'rounded-full px-5 py-2.5 text-sm font-bold transition';

    if (a.variant === 'danger') btn.classList.add('bg-rose-600', 'text-white', 'hover:bg-rose-700');
    else if (a.variant === 'primary') btn.classList.add('bg-primary', 'text-white', 'hover:brightness-110');
    else btn.classList.add('bg-slate-100', 'text-slate-800', 'hover:opacity-90', 'dark:bg-slate-800', 'dark:text-slate-100');

    btn.addEventListener('click', async () => { if (a.onClick) await a.onClick(); });
    els.uiModalActions.appendChild(btn);
  });

  els.uiModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  els.uiModal?.classList?.add?.('hidden');
  document.body.style.overflow = '';
}

bind(els.uiModal, 'click', (e) => {
  if (e.target.closest('[data-ui-close]')) closeModal();
}, 'uiModal');

document.addEventListener('keydown', (e) => {
  if (!els.uiModal) return;
  if (!els.uiModal.classList.contains('hidden') && e.key === 'Escape') closeModal();
});

function modalAlert({ title, desc, tone = 'info', icon = 'info' }) {
  openModal({
    title,
    desc,
    tone,
    icon,
    actions: [{ label: 'Aceptar', variant: 'primary', onClick: async () => closeModal() }],
  });
}

function modalErrorFriendly(err, context) {
  modalAlert({
    tone: 'danger',
    icon: 'error',
    title: 'Ocurrió un problema',
    desc: 'No pudimos completar la acción. Intenta de nuevo. Si continúa, contacta a soporte.',
  });
  console.error('[appearance][error]', context || '', err);
}

function modalConfirm({ title, desc, tone = 'danger', icon = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    openModal({
      title,
      desc,
      tone,
      icon,
      actions: [
        { label: cancelText, variant: 'default', onClick: async () => { closeModal(); resolve(false); } },
        { label: confirmText, variant: tone === 'danger' ? 'danger' : 'primary', onClick: async () => { closeModal(); resolve(true); } },
      ],
    });
  });
}

// ✅ Bloquear popups nativos
(function blockNativeDialogs() {
  try {
    window.alert = (msg) => {
      if (hasModalUI()) modalAlert({ title: 'Aviso', desc: String(msg || ' '), tone: 'info', icon: 'info' });
      else console.warn('[appearance][alert blocked]', msg);
    };
    window.confirm = (msg) => {
      if (hasModalUI()) modalAlert({ title: 'Acción requerida', desc: String(msg || ' '), tone: 'info', icon: 'info' });
      else console.warn('[appearance][confirm blocked]', msg);
      return false;
    };
  } catch (e) {
    console.warn('[appearance] No se pudo bloquear alert/confirm', e);
  }
})();

// ---------------- Tabs ----------------
function setTab(tab) {
  const isHero = tab === 'hero';
  const isAbout = tab === 'about';
  const isInsta = tab === 'instagram';

  els.panelHero?.classList?.toggle?.('hidden', !isHero);
  els.panelAbout?.classList?.toggle?.('hidden', !isAbout);
  els.panelInstagram?.classList?.toggle?.('hidden', !isInsta);

  els.tabHero?.classList?.toggle?.('tab-pill--active', isHero);
  els.tabAbout?.classList?.toggle?.('tab-pill--active', isAbout);
  els.tabInstagram?.classList?.toggle?.('tab-pill--active', isInsta);
}

bind(els.tabHero, 'click', () => setTab('hero'), 'tabHero');
bind(els.tabAbout, 'click', () => setTab('about'), 'tabAbout');
bind(els.tabInstagram, 'click', () => setTab('instagram'), 'tabInstagram');

// ---------------- Draft ----------------
function setDraftBadge(on) { els.draftBadge?.classList?.toggle?.('hidden', !on); }
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  state.usingDraft = true;
  setDraftBadge(true);
}
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ---------------- API ----------------
async function apiGet(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || 'Error');
  return data;
}
async function apiPut(url, body) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || 'Error');
  return data;
}
async function apiPost(url, bodyOrForm) {
  const isForm = bodyOrForm instanceof FormData;
  const r = await fetch(url, {
    method: 'POST',
    headers: isForm ? {} : { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: isForm ? bodyOrForm : JSON.stringify(bodyOrForm),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || 'Error');
  return data;
}

// ---------------- Upload helpers ----------------
function pickImageFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/webp,image/png,image/jpeg';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

function ensureLocalKey(item) {
  if (item._localKey) return item._localKey;
  item._localKey = (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  return item._localKey;
}

async function maybeDeleteOldImage(oldUrl) {
  if (!oldUrl) return;
  try { await apiPost(API.deleteImage, { publicUrl: oldUrl }); } catch {}
}

async function uploadAndSetUrl({ scope, recordKey, slot, setUrl, getCurrentUrl }) {
  const file = await pickImageFile();
  if (!file) return;

  if (file.type !== 'image/webp') {
    const ok = await modalConfirm({
      tone: 'info',
      icon: 'image',
      title: 'Sugerencia: WEBP',
      desc: 'WEBP suele ser más liviano que JPG/PNG. Puedes seguir con este archivo o cancelar y convertirlo a WEBP.',
      confirmText: 'Seguir igual',
      cancelText: 'Cancelar',
    });
    if (!ok) return;
  }

  const oldUrl = (getCurrentUrl ? getCurrentUrl() : '') || '';

  let deleteOld = false;
  if (oldUrl) {
    deleteOld = await modalConfirm({
      tone: 'danger',
      icon: 'delete',
      title: 'Reemplazar imagen',
      desc: '¿Quieres borrar la imagen anterior del bucket para no acumular archivos?',
      confirmText: 'Sí, borrar anterior',
      cancelText: 'No',
    });
  }

  showLoading('Subiendo imagen…');
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('scope', scope);
    fd.append('recordKey', recordKey);
    fd.append('slot', slot || 'image');

    const { publicUrl } = await apiPost(API.uploadImage, fd);

    setUrl(publicUrl);
    if (deleteOld) await maybeDeleteOldImage(oldUrl);

    hideLoading();
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, 'Subida de imagen');
  }
}

// ---------------- HERO editor ----------------
function normalizeTag(tag) {
  const t = String(tag || '').trim();
  if (!t) return '';
  return t.startsWith('#') ? t : `#${t}`;
}

// ✅ NO filtramos por image_url: si falta, mostramos ERROR_IMG
function getActiveHeroSlides() {
  return state.hero
    .filter(x => x.is_active !== false)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

function renderHeroDots(total) {
  if (!els.pv_hero_dots) return;
  els.pv_hero_dots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot' + (i === heroIndex ? ' hero-dot--active' : '');
    dot.addEventListener('click', () => {
      heroIndex = i;
      renderPreview();
    });
    els.pv_hero_dots.appendChild(dot);
  }
}

function renderHeroSlide(slides) {
  if (!els.pv_hero_img || !els.pv_hero_tag || !els.pv_hero_title || !els.pv_hero_desc) return;

  if (!slides.length) {
    els.pv_hero_img.src = ERROR_IMG;
    els.pv_hero_tag.textContent = '#HERO';
    els.pv_hero_title.textContent = 'Sin slides activos';
    els.pv_hero_desc.textContent = 'Agrega al menos uno en la pestaña Hero.';
    if (els.pv_hero_dots) els.pv_hero_dots.innerHTML = '';
    return;
  }

  if (heroIndex >= slides.length) heroIndex = 0;

  const s = slides[heroIndex];
  els.pv_hero_img.src = imgOrError(s.image_url);
  els.pv_hero_tag.textContent = normalizeTag(s.tag) || '#PROMO';
  els.pv_hero_title.textContent = s.title || '—';
  els.pv_hero_desc.textContent = s.description || '—';

  renderHeroDots(slides.length);
}

function renderHeroEditor() {
  if (!els.heroList) return;
  els.heroList.innerHTML = '';

  state.hero = [...state.hero].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  state.hero.forEach((it, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3';

    wrap.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-white/5">
            <div style="width:100%;height:100%;background-image:url('${escapeHtml(imgOrError(it.image_url))}');background-size:cover;background-position:center;"></div>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-900 dark:text-white">Slide #${idx + 1}</div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400">order_index: ${it.order_index ?? 0}</div>
          </div>
        </div>

        <button data-hero-remove="${idx}" class="rounded-full px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 hover:opacity-90 dark:bg-rose-900/30 dark:text-rose-200" type="button">
          Eliminar
        </button>
      </div>

      <div class="mt-3 grid gap-2">
        <label class="field">
          <span class="field-label">Tag (opcional)</span>
          <input class="field-input" data-hero-k="tag" data-hero-idx="${idx}" type="text" placeholder="#JUEVESQUERIDO" value="${escapeAttr(it.tag || '')}">
        </label>

        <label class="field">
          <span class="field-label">Título (obligatorio)</span>
          <input class="field-input" data-hero-k="title" data-hero-idx="${idx}" type="text" placeholder="Nuestro popular..." value="${escapeAttr(it.title || '')}">
        </label>

        <label class="field">
          <span class="field-label">Descripción (obligatorio)</span>
          <textarea class="field-textarea" data-hero-k="description" data-hero-idx="${idx}" rows="3" placeholder="Texto corto">${escapeHtml(it.description || '')}</textarea>
        </label>

        <div class="grid gap-2">
          <label class="field">
            <span class="field-label">Imagen URL (obligatorio)</span>
            <input class="field-input" data-hero-k="image_url" data-hero-idx="${idx}" type="text" placeholder="(Se llena al subir imagen)" value="${escapeAttr(it.image_url || '')}">
            <span class="field-hint">
              Sube desde tu PC y el URL se llenará solo. Recomendado: <b>WEBP</b>. Tamaño sugerido: <b>1080×1350</b>.
            </span>
          </label>

          <div class="flex items-center gap-2">
            <button class="btn-mini" type="button" data-hero-upload="${idx}">
              <span class="material-symbols-outlined text-[18px]">upload</span>
              Subir imagen
            </button>
            <button class="btn-mini" type="button" data-hero-delete-image="${idx}">
              <span class="material-symbols-outlined text-[18px]">delete</span>
              Borrar del bucket
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <label class="field">
            <span class="field-label">Order</span>
            <input class="field-input" data-hero-k="order_index" data-hero-idx="${idx}" type="number" value="${Number.isFinite(it.order_index) ? it.order_index : 0}">
          </label>

          <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 mt-6">
            <input data-hero-k="is_active" data-hero-idx="${idx}" type="checkbox" ${it.is_active ? 'checked' : ''}>
            Activo
          </label>
        </div>
      </div>
    `;

    els.heroList.appendChild(wrap);
  });
}

bind(els.btnAddHero, 'click', () => {
  const maxOrder = Math.max(0, ...state.hero.map(x => Number(x.order_index) || 0));
  state.hero.push({
    id: null,
    _localKey: null,
    tag: '',
    title: '',
    description: '',
    image_url: '',
    order_index: maxOrder + 1,
    is_active: true,
  });
  state.usingDraft = true;
  setDraftBadge(true);
  renderHeroEditor();
  renderPreview();
}, 'btnAddHero');

bind(els.heroList, 'input', (e) => {
  const t = e.target;
  const idx = Number(t.getAttribute('data-hero-idx'));
  const k = t.getAttribute('data-hero-k');
  if (!Number.isFinite(idx) || !k) return;

  const item = state.hero[idx];
  if (!item) return;

  if (k === 'is_active') item.is_active = !!t.checked;
  else if (k === 'order_index') item.order_index = Number(t.value || 0);
  else item[k] = t.value;

  state.usingDraft = true;
  setDraftBadge(true);
  renderPreview();
}, 'heroList');

bind(els.heroList, 'click', async (e) => {
  const rm = e.target.closest('[data-hero-remove]');
  if (rm) {
    const idx = Number(rm.getAttribute('data-hero-remove'));
    if (!Number.isFinite(idx)) return;

    const item = state.hero[idx];
    const ok = await modalConfirm({
      tone: 'danger',
      icon: 'delete',
      title: 'Eliminar slide',
      desc: 'Esto lo elimina del editor. (No se publica hasta que presiones Publicar).',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    if (item?.image_url) {
      const delImg = await modalConfirm({
        tone: 'danger',
        icon: 'delete',
        title: 'Borrar imagen del bucket',
        desc: '¿Quieres borrar también la imagen del bucket para evitar basura?',
        confirmText: 'Sí, borrar',
        cancelText: 'No',
      });
      if (delImg) {
        showLoading('Borrando imagen…');
        try { await apiPost(API.deleteImage, { publicUrl: item.image_url }); }
        catch (err) { modalErrorFriendly(err, 'Borrado de imagen (hero)'); }
        hideLoading();
      }
    }

    state.hero.splice(idx, 1);
    state.usingDraft = true;
    setDraftBadge(true);

    if (heroIndex >= state.hero.length) heroIndex = 0;

    renderHeroEditor();
    renderPreview();
    return;
  }

  const up = e.target.closest('[data-hero-upload]');
  if (up) {
    const idx = Number(up.getAttribute('data-hero-upload'));
    const item = state.hero[idx];
    if (!item) return;

    const recordKey = item.id ? `id-${item.id}` : `local-${ensureLocalKey(item)}`;

    await uploadAndSetUrl({
      scope: 'hero',
      recordKey,
      slot: 'image',
      getCurrentUrl: () => item.image_url,
      setUrl: (url) => {
        item.image_url = url;
        state.usingDraft = true;
        setDraftBadge(true);
        renderHeroEditor();
        renderPreview();
      },
    });
    return;
  }

  const del = e.target.closest('[data-hero-delete-image]');
  if (del) {
    const idx = Number(del.getAttribute('data-hero-delete-image'));
    const item = state.hero[idx];

    if (!item || !item.image_url) {
      modalAlert({ tone: 'info', icon: 'info', title: 'Sin imagen', desc: 'Este slide no tiene imagen cargada.' });
      return;
    }

    const ok = await modalConfirm({
      tone: 'danger',
      icon: 'delete',
      title: 'Borrar imagen del bucket',
      desc: 'Se borrará el archivo del bucket. El campo URL quedará vacío.',
      confirmText: 'Sí, borrar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    showLoading('Borrando imagen…');
    try {
      await apiPost(API.deleteImage, { publicUrl: item.image_url });
      item.image_url = ''; // ✅ queda vacío y el preview mostrará ERROR_IMG
      state.usingDraft = true;
      setDraftBadge(true);
      hideLoading();
      renderHeroEditor();
      renderPreview();
    } catch (err) {
      hideLoading();
      modalErrorFriendly(err, 'Borrado de imagen (hero)');
    }
  }
}, 'heroList');

// ---------------- ABOUT inputs ----------------
function applyStateToInputs() {
  if (!els.about_title) return;
  const a = state.about;
  els.about_title.value = a.title || '';
  els.about_tagline.value = a.tagline || '';
  els.about_badge_text.value = a.badge_text || '';
  els.about_image_url.value = a.image_url || '';
  els.about_body.value = a.body || '';
  els.about_cta_text.value = a.cta_text || 'Pide aquí';
  els.about_cta_href.value = a.cta_href || '/stores';
  els.about_instagram_handle.value = a.instagram_handle || '@tierraquerida20';
}

function pullAboutFromInputs() {
  if (!els.about_title) return;
  state.about.title = els.about_title.value;
  state.about.tagline = els.about_tagline.value;
  state.about.badge_text = els.about_badge_text.value;
  state.about.image_url = els.about_image_url.value;
  state.about.body = els.about_body.value;
  state.about.cta_text = els.about_cta_text.value;
  state.about.cta_href = els.about_cta_href.value;
  state.about.instagram_handle = els.about_instagram_handle.value;
}

[
  els.about_title, els.about_tagline, els.about_badge_text, els.about_image_url,
  els.about_body, els.about_cta_text, els.about_cta_href, els.about_instagram_handle
].forEach((el) => {
  if (!el) return;
  el.addEventListener('input', () => {
    pullAboutFromInputs();
    state.usingDraft = true;
    setDraftBadge(true);
    renderPreview();
  });
});

// ✅ Upload About
bind(els.btnUploadAbout, 'click', async () => {
  const recordKey = 'about-main';
  await uploadAndSetUrl({
    scope: 'about',
    recordKey,
    slot: 'image',
    getCurrentUrl: () => state.about.image_url,
    setUrl: (url) => {
      state.about.image_url = url;
      if (els.about_image_url) els.about_image_url.value = url;
      state.usingDraft = true;
      setDraftBadge(true);
      renderPreview();
    },
  });
}, 'btnUploadAbout');

// ✅ Delete About image from bucket
bind(els.btnDeleteAboutImage, 'click', async () => {
  const current = String(state.about.image_url || '').trim();
  if (!current) {
    modalAlert({ tone: 'info', icon: 'info', title: 'Sin imagen', desc: 'No hay imagen cargada en About.' });
    return;
  }

  const ok = await modalConfirm({
    tone: 'danger',
    icon: 'delete',
    title: 'Borrar imagen del bucket',
    desc: 'Se borrará el archivo del bucket. El campo URL quedará vacío.',
    confirmText: 'Sí, borrar',
    cancelText: 'Cancelar',
  });
  if (!ok) return;

  showLoading('Borrando imagen…');
  try {
    await apiPost(API.deleteImage, { publicUrl: current });
    state.about.image_url = '';
    if (els.about_image_url) els.about_image_url.value = '';
    state.usingDraft = true;
    setDraftBadge(true);
    hideLoading();
    renderPreview();
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, 'Borrado de imagen (about)');
  }
}, 'btnDeleteAboutImage');

// ---------------- Instagram editor ----------------
function renderInstagramEditor() {
  if (!els.instaList) return;
  els.instaList.innerHTML = '';

  state.instagram
    .sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0))
    .forEach((item, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3';

      wrap.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2">
            <div class="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-white/5">
              <div style="width:100%;height:100%;background-image:url('${escapeHtml(imgOrError(item.image_url))}');background-size:cover;background-position:center;"></div>
            </div>
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">Item #${idx + 1}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">order_index: ${item.order_index ?? 0}</div>
            </div>
          </div>

          <button data-insta-remove="${idx}" class="rounded-full px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 hover:opacity-90 dark:bg-rose-900/30 dark:text-rose-200" type="button">
            Eliminar
          </button>
        </div>

        <div class="mt-3 grid gap-2">
          <label class="field">
            <span class="field-label">Imagen URL</span>
            <input class="field-input" data-insta-k="image_url" data-insta-idx="${idx}" type="text" placeholder="(Se llena al subir imagen)" value="${escapeAttr(item.image_url || '')}">
            <span class="field-hint">Recomendado: <b>WEBP</b> 1080×1080.</span>
          </label>

          <div class="flex items-center gap-2">
            <button class="btn-mini" type="button" data-insta-upload="${idx}">
              <span class="material-symbols-outlined text-[18px]">upload</span>
              Subir imagen
            </button>
            <button class="btn-mini" type="button" data-insta-delete-image="${idx}">
              <span class="material-symbols-outlined text-[18px]">delete</span>
              Borrar del bucket
            </button>
          </div>

          <label class="field">
            <span class="field-label">Caption</span>
            <input class="field-input" data-insta-k="caption" data-insta-idx="${idx}" type="text" placeholder="Texto opcional" value="${escapeAttr(item.caption || '')}">
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="field">
              <span class="field-label">Href</span>
              <input class="field-input" data-insta-k="href" data-insta-idx="${idx}" type="text" placeholder="https://instagram.com/..." value="${escapeAttr(item.href || '')}">
            </label>

            <label class="field">
              <span class="field-label">Order</span>
              <input class="field-input" data-insta-k="order_index" data-insta-idx="${idx}" type="number" value="${Number.isFinite(item.order_index) ? item.order_index : 0}">
            </label>
          </div>

          <label class="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <input data-insta-k="is_active" data-insta-idx="${idx}" type="checkbox" ${item.is_active ? 'checked' : ''}>
            Activo
          </label>
        </div>
      `;

      els.instaList.appendChild(wrap);
    });
}

bind(els.btnAddInsta, 'click', () => {
  const maxOrder = Math.max(0, ...state.instagram.map(x => Number(x.order_index) || 0));
  state.instagram.push({
    id: null,
    _localKey: null,
    image_url: '',
    caption: '',
    href: '',
    order_index: maxOrder + 1,
    is_active: true
  });
  state.usingDraft = true;
  setDraftBadge(true);
  renderInstagramEditor();
  renderPreview();
}, 'btnAddInsta');

bind(els.instaList, 'input', (e) => {
  const t = e.target;
  const idx = Number(t.getAttribute('data-insta-idx'));
  const k = t.getAttribute('data-insta-k');
  if (!Number.isFinite(idx) || !k) return;

  const item = state.instagram[idx];
  if (!item) return;

  if (k === 'is_active') item.is_active = !!t.checked;
  else if (k === 'order_index') item.order_index = Number(t.value || 0);
  else item[k] = t.value;

  state.usingDraft = true;
  setDraftBadge(true);
  renderPreview();
}, 'instaList');

bind(els.instaList, 'click', async (e) => {
  const rm = e.target.closest('[data-insta-remove]');
  if (rm) {
    const idx = Number(rm.getAttribute('data-insta-remove'));
    const item = state.instagram[idx];
    if (!Number.isFinite(idx) || !item) return;

    const ok = await modalConfirm({
      tone: 'danger',
      icon: 'delete',
      title: 'Eliminar item',
      desc: 'Esto lo elimina del editor. (No se publica hasta Publicar).',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    if (item?.image_url) {
      const delImg = await modalConfirm({
        tone: 'danger',
        icon: 'delete',
        title: 'Borrar imagen del bucket',
        desc: '¿Quieres borrar también la imagen del bucket para evitar basura?',
        confirmText: 'Sí, borrar',
        cancelText: 'No',
      });
      if (delImg) {
        showLoading('Borrando imagen…');
        try { await apiPost(API.deleteImage, { publicUrl: item.image_url }); }
        catch (err) { modalErrorFriendly(err, 'Borrado de imagen (instagram)'); }
        hideLoading();
      }
    }

    state.instagram.splice(idx, 1);
    state.usingDraft = true;
    setDraftBadge(true);
    renderInstagramEditor();
    renderPreview();
    return;
  }

  const up = e.target.closest('[data-insta-upload]');
  if (up) {
    const idx = Number(up.getAttribute('data-insta-upload'));
    const item = state.instagram[idx];
    if (!item) return;

    const recordKey = item.id ? `id-${item.id}` : `local-${ensureLocalKey(item)}`;

    await uploadAndSetUrl({
      scope: 'instagram',
      recordKey,
      slot: 'image',
      getCurrentUrl: () => item.image_url,
      setUrl: (url) => {
        item.image_url = url;
        state.usingDraft = true;
        setDraftBadge(true);
        renderInstagramEditor();
        renderPreview();
      },
    });
    return;
  }

  const del = e.target.closest('[data-insta-delete-image]');
  if (del) {
    const idx = Number(del.getAttribute('data-insta-delete-image'));
    const item = state.instagram[idx];

    if (!item || !item.image_url) {
      modalAlert({ tone: 'info', icon: 'info', title: 'Sin imagen', desc: 'Este item no tiene imagen cargada.' });
      return;
    }

    const ok = await modalConfirm({
      tone: 'danger',
      icon: 'delete',
      title: 'Borrar imagen del bucket',
      desc: 'Se borrará el archivo del bucket. El campo URL quedará vacío.',
      confirmText: 'Sí, borrar',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    showLoading('Borrando imagen…');
    try {
      await apiPost(API.deleteImage, { publicUrl: item.image_url });
      item.image_url = '';
      state.usingDraft = true;
      setDraftBadge(true);
      hideLoading();
      renderInstagramEditor();
      renderPreview();
    } catch (err) {
      hideLoading();
      modalErrorFriendly(err, 'Borrado de imagen (instagram)');
    }
  }
}, 'instaList');

// ---------------- Preview ----------------
function renderPreview() {
  const heroSlides = getActiveHeroSlides();
  renderHeroSlide(heroSlides);

  const a = state.about;

  if (els.pv_title) els.pv_title.textContent = a.title || '—';
  if (els.pv_tagline) els.pv_tagline.textContent = a.tagline || '—';

  const badge = (a.badge_text || '').trim();
  if (els.pv_badge_wrap && els.pv_badge_text) {
    if (badge) {
      els.pv_badge_wrap.style.display = 'inline-flex';
      els.pv_badge_text.textContent = badge;
    } else {
      els.pv_badge_wrap.style.display = 'none';
    }
  }

  if (els.pv_about_img) els.pv_about_img.src = imgOrError(a.image_url);

  if (els.pv_body) {
    els.pv_body.innerHTML = '';
    const parts = (a.body || '').split(/\n\s*\n/g).map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      const p = document.createElement('p');
      p.textContent = '—';
      els.pv_body.appendChild(p);
    } else {
      parts.forEach(t => {
        const p = document.createElement('p');
        p.textContent = t;
        els.pv_body.appendChild(p);
      });
    }
  }

  if (els.pv_cta_text) els.pv_cta_text.textContent = a.cta_text || 'Pide aquí';
  if (els.pv_cta) els.pv_cta.href = a.cta_href || '/stores';

  if (els.pv_ig) els.pv_ig.textContent = a.instagram_handle || '@tierraquerida20';
  if (els.pv_ig2) els.pv_ig2.textContent = a.instagram_handle || '@tierraquerida20';

  if (!els.pv_insta_grid) return;

  els.pv_insta_grid.innerHTML = '';
  const instaItems = state.instagram
    .filter(x => x.is_active !== false)
    .sort((x, y) => (x.order_index ?? 0) - (y.order_index ?? 0))
    .slice(0, 8);

  if (instaItems.length === 0) {
    const div = document.createElement('div');
    div.className = 'text-sm text-slate-600 dark:text-slate-300';
    div.textContent = 'No hay items activos.';
    els.pv_insta_grid.appendChild(div);
  } else {
    instaItems.forEach((it) => {
      const card = document.createElement('a');
      card.href = it.href || '#';
      card.target = it.href ? '_blank' : '_self';
      card.className = 'group block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:opacity-95 transition';

      card.innerHTML = `
        <div style="height:140px;background-image:url('${escapeHtml(imgOrError(it.image_url))}');background-size:cover;background-position:center;"></div>
        <div class="p-3">
          <div class="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">${escapeHtml(it.caption || 'Ver en Instagram')}</div>
          <div class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">${escapeHtml(it.href || '')}</div>
        </div>
      `;
      els.pv_insta_grid.appendChild(card);
    });
  }
}

// ✅ fallback si la URL está rota/404
if (els.pv_hero_img) {
  els.pv_hero_img.addEventListener('error', () => { els.pv_hero_img.src = ERROR_IMG; });
}
if (els.pv_about_img) {
  els.pv_about_img.addEventListener('error', () => { els.pv_about_img.src = ERROR_IMG; });
}

// Flechas hero preview (sin autoplay)
bind(els.pv_hero_prev, 'click', () => {
  const slides = getActiveHeroSlides();
  if (slides.length <= 1) return;
  heroIndex = (heroIndex - 1 + slides.length) % slides.length;
  renderPreview();
}, 'pv_hero_prev');

bind(els.pv_hero_next, 'click', () => {
  const slides = getActiveHeroSlides();
  if (slides.length <= 1) return;
  heroIndex = (heroIndex + 1) % slides.length;
  renderPreview();
}, 'pv_hero_next');

// ---------------- Load DB ----------------
async function loadCurrentFromDB() {
  showLoading('Cargando configuración…');
  const [hero, about, insta] = await Promise.all([
    apiGet(API.heroGet),
    apiGet(API.aboutGet),
    apiGet(API.instaGet),
  ]);

  state.hero = hero.items || [];
  state.about = about.about || state.about;
  state.instagram = insta.items || [];

  state.usingDraft = false;
  setDraftBadge(false);

  applyStateToInputs();
  renderHeroEditor();
  renderInstagramEditor();
  renderPreview();
  hideLoading();
}

// ---------------- Buttons ----------------
bind(els.btnLoad, 'click', async () => {
  try { await loadCurrentFromDB(); }
  catch (e) {
    hideLoading();
    modalErrorFriendly(e, 'Cargando configuración');
  }
}, 'btnLoad');

bind(els.btnSaveDraft, 'click', async () => {
  showLoading('Guardando borrador…');
  try {
    saveDraft();
  } catch (e) {
    modalErrorFriendly(e, 'Guardando borrador');
  } finally {
    hideLoading();
  }

  openModal({
    tone: 'success',
    icon: 'check_circle',
    title: 'Borrador guardado',
    desc: ' ',
    actions: [{ label: 'Aceptar', variant: 'primary', onClick: async () => closeModal() }],
  });
}, 'btnSaveDraft');

bind(els.btnPublish, 'click', async () => {
  const ok = await modalConfirm({
    tone: 'info',
    icon: 'publish',
    title: 'Publicar cambios',
    desc: 'Esto actualizará la landing en la base de datos. ¿Continuar?',
    confirmText: 'Sí, publicar',
    cancelText: 'Cancelar',
  });
  if (!ok) return;

  showLoading('Publicando cambios…');

  try {
    pullAboutFromInputs();

    await apiPut(API.heroPut, { items: state.hero });
    await apiPut(API.aboutPut, { about: state.about });
    await apiPut(API.instaPut, { items: state.instagram });

    localStorage.removeItem(DRAFT_KEY);
    state.usingDraft = false;
    setDraftBadge(false);

    hideLoading();
    modalAlert({ tone: 'success', icon: 'check_circle', title: 'Publicado', desc: 'Los cambios ya quedaron guardados.' });
  } catch (e) {
    hideLoading();
    modalErrorFriendly(e, 'Publicando cambios');
  }
}, 'btnPublish');

// ---------------- Utils ----------------
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

// ---------------- Init ----------------
(async function init() {
  setTab('hero');

  const draft = loadDraft();
  if (draft && Array.isArray(draft.hero) && draft.about && Array.isArray(draft.instagram)) {
    state = draft;
    state.usingDraft = true;
    setDraftBadge(true);

    applyStateToInputs();
    renderHeroEditor();
    renderInstagramEditor();
    renderPreview();
    return;
  }

  try {
    await loadCurrentFromDB();
  } catch (e) {
    modalErrorFriendly(e, 'Carga inicial');
    applyStateToInputs();
    renderHeroEditor();
    renderInstagramEditor();
    renderPreview();
  }
})();
