'use strict';

const express = require('express');
const crypto = require('crypto');
const supabase = require('./supabase');

const authRouter = express.Router();

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE || 'admin_session';
const SESSION_DAYS = Number(process.env.ADMIN_SESSION_DAYS || 7);

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || '';
}

function setSessionCookie(res, token) {
  const secure = String(process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true';
  const maxAgeMs = SESSION_DAYS * 24 * 60 * 60 * 1000;

  let cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(maxAgeMs / 1000)}`;
  if (secure) cookie += '; Secure';

  res.setHeader('Set-Cookie', cookie);
}

function clearSessionCookie(res) {
  const secure = String(process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true';
  let cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (secure) cookie += '; Secure';
  res.setHeader('Set-Cookie', cookie);
}

async function getAdminFromRequest(req) {
  const token = getSessionToken(req);
  if (!token) return null;

  const { data, error } = await supabase
    .from('admin_sessions')
    .select('token, expires_at, admin:admin_users(id,email,role,is_active)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data || !data.admin) return null;

  const expiresAt = new Date(data.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return null;

  if (data.admin.is_active !== true) return null;

  return data.admin;
}

function requireAdmin(req, res, next) {
  getAdminFromRequest(req)
    .then((admin) => {
      if (!admin) return res.status(401).json({ ok: false, error: 'No autorizado' });
      req.admin = admin;
      next();
    })
    .catch(() => res.status(500).json({ ok: false, error: 'Error validando sesión' }));
}

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const emailRaw = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');

    if (!emailRaw || !password) {
      return res.status(400).json({ ok: false, error: 'Email y contraseña son obligatorios' });
    }

    const email = emailRaw.toLowerCase();

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id,email,password_hash,role,is_active')
      .eq('email', email)
      .maybeSingle();

    // Mensaje genérico (no revelar si existe)
    if (error || !admin || admin.is_active !== true) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    // ⚠️ TEMPORAL: comparación directa (texto plano)
    // Aquí password_hash realmente contiene la contraseña en texto plano.
    if (password !== admin.password_hash) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }

    const token = crypto.randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase
      .from('admin_sessions')
      .insert([{ admin_id: admin.id, token, expires_at: expiresAt }]);

    if (insertErr) {
      return res.status(500).json({ ok: false, error: 'No se pudo crear la sesión' });
    }

    setSessionCookie(res, token);

    return res.json({
      ok: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'Error en login' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req, res) => {
  try {
    const token = getSessionToken(req);
    if (token) await supabase.from('admin_sessions').delete().eq('token', token);
    clearSessionCookie(res);
    return res.json({ ok: true });
  } catch {
    clearSessionCookie(res);
    return res.json({ ok: true });
  }
});

// GET /api/auth/me
authRouter.get('/me', async (req, res) => {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) return res.status(401).json({ ok: false, error: 'No autorizado' });
    return res.json({ ok: true, admin: { id: admin.id, email: admin.email, role: admin.role } });
  } catch {
    return res.status(500).json({ ok: false, error: 'Error consultando sesión' });
  }
});

module.exports = { authRouter, requireAdmin };
