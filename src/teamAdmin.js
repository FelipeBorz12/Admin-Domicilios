'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

const router = express.Router();

// =========================
// Password security helpers
// =========================

function isCommonPassword(pw) {
  const common = new Set([
    '123456','12345678','123456789','password','qwerty','abc123','111111',
    '123123','admin','letmein','iloveyou','000000','passw0rd','password1',
    '12345','11111111','qwerty123','admin123','welcome','iloveyou1',
  ]);
  return common.has(String(pw || '').toLowerCase());
}

function normalizeEmailParts(correo) {
  const c = String(correo || '').toLowerCase().trim();
  const [userRaw, domainRaw] = c.split('@');
  const user = userRaw || '';
  const domain = domainRaw || '';
  const domainMain = (domain.split('.')[0] || '');
  return { c, user, domainMain };
}

function hasSequentialPattern(pw) {
  const s = String(pw || '').toLowerCase();
  const seqs = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];
  for (const seq of seqs) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const sub = seq.slice(i, i + 4);
      if (s.includes(sub)) return true;
    }
  }
  return false;
}

function hasRepeatedChars(pw) {
  return /(.)\1\1\1/.test(String(pw || '')); // 4 iguales seguidos
}

function validatePasswordStrong(pw, correo) {
  const p = String(pw || '');

  if (!p) return 'La contraseña es obligatoria.';
  if (p.length < 12) return 'La contraseña debe tener mínimo 12 caracteres.';
  // bcrypt usa ~72 bytes; si permites más, se trunca silenciosamente
  if (p.length > 72) return 'La contraseña no puede superar 72 caracteres (límite seguro por bcrypt).';
  if (/\s/.test(p)) return 'La contraseña no puede contener espacios.';

  const hasLower = /[a-z]/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  const hasDigit = /[0-9]/.test(p);
  const hasSym = /[^A-Za-z0-9]/.test(p);

  if (!(hasLower && hasUpper && hasDigit && hasSym)) {
    return 'Debe incluir mayúscula, minúscula, número y símbolo.';
  }

  if (isCommonPassword(p)) return 'Esa contraseña es demasiado común.';
  if (hasSequentialPattern(p)) return 'Evita secuencias obvias (abcd, 1234, etc.).';
  if (hasRepeatedChars(p)) return 'Evita repetir el mismo carácter muchas veces (ej: aaaa).';

  const { c, user, domainMain } = normalizeEmailParts(correo);
  const s = p.toLowerCase();

  if (c && s.includes(c)) return 'No uses el correo completo dentro de la contraseña.';
  if (user && user.length >= 4 && s.includes(user)) return 'No incluyas el usuario del correo dentro de la contraseña.';
  if (domainMain && domainMain.length >= 4 && s.includes(domainMain)) return 'No incluyas el dominio del correo dentro de la contraseña.';

  return null;
}

// Generación fuerte: garantiza may/min/num/símbolo y evita caracteres confusos
function generateStrongPassword(length = 14) {
  const upp = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const low = 'abcdefghijkmnpqrstuvwxyz';
  const dig = '23456789';
  const sym = '!@#$%&*?-_';
  const all = upp + low + dig + sym;

  const pick = (str) => str[Math.floor(Math.random() * str.length)];

  let out = [pick(upp), pick(low), pick(dig), pick(sym)];
  while (out.length < length) out.push(pick(all));

  // shuffle Fisher–Yates
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out.join('');
}

// =========================
// Error mapping
// =========================
function friendlyError(err) {
  const msg = err?.message || err?.error_description || String(err || '');

  // Uniques (correo / PuntoVenta)
  if (/usercocina_correo_key/i.test(msg) || /duplicate key.*correo/i.test(msg)) {
    return 'Ese correo ya existe.';
  }
  if (/usercocina_PuntoVenta_key/i.test(msg) || /duplicate key.*PuntoVenta/i.test(msg)) {
    return 'Ese local (PuntoVenta) ya está asignado a otro usuario.';
  }

  // FK a Coordenadas_PV(Barrio)
  if (/usercocina_PuntoVenta_fkey/i.test(msg) || /violates foreign key/i.test(msg)) {
    return 'El local seleccionado no existe (FK a Coordenadas_PV.Barrio).';
  }

  return msg || 'Error inesperado.';
}

/**
 * GET /api/admin/puntosventa
 * Devuelve lista de barrios (Coordenadas_PV.Barrio)
 */
router.get('/puntosventa', async (req, res) => {
  const { data, error } = await supabase
    .from('Coordenadas_PV')
    .select('Barrio')
    .order('Barrio', { ascending: true });

  if (error) return res.status(500).json({ error: friendlyError(error) });

  const barrios = [...new Set((data || []).map(r => r.Barrio).filter(Boolean))];
  res.json({ barrios });
});

/**
 * GET /api/admin/usercocina
 */
router.get('/usercocina', async (req, res) => {
  const { data, error } = await supabase
    .from('usercocina')
    .select('id, administrador, correo, "PuntoVenta"')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: friendlyError(error) });
  res.json({ users: data || [] });
});

/**
 * POST /api/admin/usercocina
 * Crea usuario.
 * - Si NO envías password => genera una contraseña fuerte y la devuelve una sola vez (passwordPlain).
 * - Si envías password => valida seguridad, hashea y NO devuelve passwordPlain.
 */
router.post('/usercocina', async (req, res) => {
  try {
    const { administrador, correo, PuntoVenta, password } = req.body || {};

    if (!administrador || !correo || !PuntoVenta) {
      return res.status(400).json({ error: 'Faltan campos: administrador, correo, PuntoVenta.' });
    }

    let plain = null;
    let hash = null;

    // Manual password (si viene)
    if (password !== undefined && password !== null && String(password).length > 0) {
      const err = validatePasswordStrong(password, correo);
      if (err) return res.status(400).json({ error: err });

      hash = await bcrypt.hash(String(password), 10);
      plain = null; // importante: NO devolvemos password manual
    } else {
      // Auto generated
      plain = generateStrongPassword(14);
      // sanity check (por si cambias reglas)
      const err = validatePasswordStrong(plain, correo);
      if (err) {
        // fallback: intenta otra vez con longitud mayor
        plain = generateStrongPassword(16);
      }
      hash = await bcrypt.hash(plain, 10);
    }

    const { data, error } = await supabase
      .from('usercocina')
      .insert([{ administrador, correo, contraseña: hash, PuntoVenta }])
      .select('id, administrador, correo, "PuntoVenta"')
      .single();

    if (error) return res.status(400).json({ error: friendlyError(error) });

    res.status(201).json({
      user: data,
      passwordPlain: plain, // solo si fue auto; si fue manual será null
    });
  } catch (e) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

/**
 * PUT /api/admin/usercocina/:id
 * (No cambia contraseña aquí; se hace con reset-password)
 */
router.put('/usercocina/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { administrador, correo, PuntoVenta, password } = req.body || {};

    if (!administrador || !correo || !PuntoVenta) {
      return res.status(400).json({ error: 'Faltan campos: administrador, correo, PuntoVenta.' });
    }

    const updatePayload = { administrador, correo, PuntoVenta };

    if (password !== undefined && password !== null && String(password).length > 0) {
      const err = validatePasswordStrong(String(password), correo);
      if (err) return res.status(400).json({ error: err });
      updatePayload.contraseña = await bcrypt.hash(String(password), 10);
    }

    const { data, error } = await supabase
      .from('usercocina')
      .update(updatePayload)
      .eq('id', id)
      .select('id, administrador, correo, "PuntoVenta"')
      .single();

    if (error) return res.status(400).json({ error: friendlyError(error) });

    res.json({ user: data });
  } catch (e) {
    res.status(500).json({ error: friendlyError(e) });
  }
});


/**
 * POST /api/admin/usercocina/:id/reset-password
 * Resetea contraseña y devuelve password en claro una sola vez.
 */
router.post('/usercocina/:id/reset-password', async (req, res) => {
  try {
    const id = req.params.id;

    const found = await supabase
      .from('usercocina')
      .select('id, correo')
      .eq('id', id)
      .single();

    if (found.error || !found.data) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let plain = generateStrongPassword(14);
    const err = validatePasswordStrong(plain, found.data.correo);
    if (err) plain = generateStrongPassword(16);

    const hash = await bcrypt.hash(plain, 10);

    const { error } = await supabase
      .from('usercocina')
      .update({ contraseña: hash })
      .eq('id', id);

    if (error) return res.status(400).json({ error: friendlyError(error) });

    res.json({ id, correo: found.data.correo, passwordPlain: plain });
  } catch (e) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

/**
 * DELETE /api/admin/usercocina/:id
 */
router.delete('/usercocina/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from('usercocina')
      .delete()
      .eq('id', id);

    if (error) return res.status(400).json({ error: friendlyError(error) });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: friendlyError(e) });
  }
});

module.exports = router;
