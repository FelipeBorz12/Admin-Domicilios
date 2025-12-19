'use strict';

const express = require('express');
const multer = require('multer');
const supabase = require('./supabase');

const router = express.Router();

// ✅ Bucket + subcarpeta (prefijo)
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'imagen_productos';
const BASE_FOLDER = process.env.SUPABASE_STORAGE_BASE_FOLDER || 'pagina';

// Multer en memoria (no guarda en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
});

const ALLOWED_MIME = new Set(['image/webp', 'image/png', 'image/jpeg']);

// Construye publicUrl desde bucket/path
function getPublicUrl(bucket, objectPath) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data?.publicUrl || null;
}

// Intenta extraer path desde publicUrl
function extractPathFromPublicUrl(publicUrl) {
  // Ej: https://xxxx.supabase.co/storage/v1/object/public/<bucket>/<path>
  try {
    const u = new URL(publicUrl);
    const parts = u.pathname.split('/storage/v1/object/public/');
    if (parts.length < 2) return null;
    const rest = parts[1]; // <bucket>/<path>
    const idx = rest.indexOf('/');
    if (idx === -1) return null;
    const bucket = rest.slice(0, idx);
    const path = rest.slice(idx + 1);
    return { bucket, path };
  } catch {
    return null;
  }
}

/* =========================
   HERO
   ========================= */
router.get('/landing/hero', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_hero')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

router.put('/landing/hero', async (req, res) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ ok: false, error: 'items debe ser un array' });
    }

    const payload = items.map((it) => ({
      id: it.id || undefined,
      title: String(it.title || '').trim(),
      description: String(it.description || '').trim(),
      tag: it.tag === null || it.tag === undefined ? null : String(it.tag || '').trim(),
      image_url: String(it.image_url || '').trim(),
      order_index: Number.isFinite(it.order_index) ? it.order_index : Number(it.order_index || 0),
      is_active: it.is_active !== false,
    }));

    if (payload.some((p) => !p.title || !p.description || !p.image_url)) {
      return res
        .status(400)
        .json({ ok: false, error: 'Cada slide debe tener: title, description, image_url' });
    }

    const { data, error } = await supabase
      .from('landing_hero')
      .upsert(payload, { onConflict: 'id' })
      .select('*');

    if (error) throw error;
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

/* =========================
   ABOUT
   ========================= */
router.get('/landing/about', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_about')
      .select('*')
      .order('id', { ascending: true })
      .limit(1);

    if (error) throw error;

    const row = data && data[0] ? data[0] : null;

    const about = row || {
      id: null,
      title: '¿Quiénes Somos?',
      tagline: '#Movimiento TQ',
      body: '',
      image_url: '/img/empleados.png',
      badge_text: '',
      cta_text: 'Pide aquí',
      cta_href: '/stores',
      instagram_handle: '@tierraquerida20',
    };

    return res.json({ ok: true, about });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

router.put('/landing/about', async (req, res) => {
  try {
    const about = req.body.about;

    if (!about || !about.title || !about.image_url || typeof about.body !== 'string') {
      return res
        .status(400)
        .json({ ok: false, error: 'Faltan campos: about.title, about.image_url, about.body' });
    }

    const payload = {
      id: about.id || undefined,
      title: about.title,
      tagline: about.tagline ?? null,
      body: about.body,
      image_url: about.image_url,
      badge_text: about.badge_text ?? null,
      cta_text: about.cta_text || 'Pide aquí',
      cta_href: about.cta_href || '/stores',
      instagram_handle: about.instagram_handle ?? '@tierraquerida20',
    };

    const { data, error } = await supabase
      .from('landing_about')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw error;

    return res.json({ ok: true, about: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

/* =========================
   INSTAGRAM
   ========================= */
router.get('/landing/instagram', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('landing_instagram')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

router.put('/landing/instagram', async (req, res) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({ ok: false, error: 'items debe ser un array' });
    }

    const payload = items.map((it) => ({
      id: it.id || undefined,
      image_url: String(it.image_url || '').trim(),
      caption: it.caption ?? null,
      href: it.href ?? null,
      order_index: Number.isFinite(it.order_index) ? it.order_index : Number(it.order_index || 0),
      is_active: it.is_active !== false,
    }));

    if (payload.some((p) => !p.image_url)) {
      return res.status(400).json({ ok: false, error: 'Todos los items deben tener image_url' });
    }

    const { data, error } = await supabase
      .from('landing_instagram')
      .upsert(payload, { onConflict: 'id' })
      .select('*');

    if (error) throw error;

    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

/* =========================
   UPLOAD IMAGE (bucket)
   - scope: 'hero' | 'instagram' | 'about'
   - recordKey: id o un key local (estable)
   - slot: para diferenciar (ej: 'image')
   ========================= */
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const scope = String(req.body.scope || '').trim();
    const recordKey = String(req.body.recordKey || '').trim();
    const slot = String(req.body.slot || 'image').trim();

    if (!file) return res.status(400).json({ ok: false, error: 'No se recibió archivo (field: file)' });
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return res.status(400).json({ ok: false, error: 'Formato no permitido. Usa webp, jpg o png.' });
    }
    if (!scope || !recordKey) {
      return res.status(400).json({ ok: false, error: 'Faltan campos: scope y recordKey' });
    }

    // ✅ RUTA FIJA para evitar llenar el bucket (sobrescribe el mismo objeto)
    // Ej: pagina/hero/id-12/image  o  pagina/instagram/local-uuid/image
    const objectPath = `${BASE_FOLDER}/${scope}/${recordKey}/${slot}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

    if (upErr) throw upErr;

    const publicUrl = getPublicUrl(BUCKET, objectPath);
    if (!publicUrl) return res.status(500).json({ ok: false, error: 'No se pudo obtener publicUrl' });

    return res.json({ ok: true, bucket: BUCKET, path: objectPath, publicUrl });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

/* =========================
   DELETE IMAGE (bucket)
   body: { path } OR { publicUrl }
   ========================= */
router.post('/delete-image', async (req, res) => {
  try {
    const path = req.body?.path ? String(req.body.path).trim() : '';
    const publicUrl = req.body?.publicUrl ? String(req.body.publicUrl).trim() : '';

    let bucket = BUCKET;
    let objectPath = path;

    if (!objectPath && publicUrl) {
      const parsed = extractPathFromPublicUrl(publicUrl);
      if (!parsed) return res.status(400).json({ ok: false, error: 'No se pudo extraer path desde publicUrl' });
      bucket = parsed.bucket;
      objectPath = parsed.path;
    }

    if (!objectPath) return res.status(400).json({ ok: false, error: 'Debes enviar path o publicUrl' });

    const { error } = await supabase.storage.from(bucket).remove([objectPath]);
    if (error) throw error;

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

module.exports = router;
