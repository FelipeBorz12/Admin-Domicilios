'use strict';

const express = require('express');
const supabase = require('./supabase');

const router = express.Router();

// Helpers
function bad(res, msg, code = 400) {
  return res.status(code).json({ ok: false, error: msg });
}
function normText(v) {
  return String(v ?? '').trim();
}
function normNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDateOnlyToISOStart(dateStr) {
  // dateStr: "YYYY-MM-DD" -> ISO start of day UTC-ish (Supabase compares timestamptz; ok for ranges)
  const s = normText(dateStr);
  if (!s) return null;
  // Validación ligera
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return `${s}T00:00:00.000Z`;
}
function addDaysISO(iso, days) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// GET /api/admin/pv -> lista completa (filtras en front)
router.get('/pv', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Coordenadas_PV')
      .select('*')
      .order('Departamento', { ascending: true })
      .order('Municipio', { ascending: true })
      .order('Barrio', { ascending: true });

    if (error) return bad(res, error.message, 500);
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return bad(res, 'Error listando puntos de venta', 500);
  }
});

// GET /api/admin/pv/meta -> departamentos/municipios (para dropdowns)
router.get('/pv/meta', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Coordenadas_PV')
      .select('Departamento, Municipio');

    if (error) return bad(res, error.message, 500);

    const deps = new Set();
    const munByDep = new Map(); // dep -> Set(muni)

    for (const r of data || []) {
      const dep = String(r.Departamento || '').trim();
      const muni = String(r.Municipio || '').trim();
      if (dep) deps.add(dep);
      if (dep && muni) {
        if (!munByDep.has(dep)) munByDep.set(dep, new Set());
        munByDep.get(dep).add(muni);
      }
    }

    const out = {
      departamentos: Array.from(deps).sort((a, b) => a.localeCompare(b, 'es')),
      municipiosByDepartamento: Object.fromEntries(
        Array.from(munByDep.entries()).map(([dep, set]) => [
          dep,
          Array.from(set).sort((a, b) => a.localeCompare(b, 'es')),
        ])
      ),
    };

    return res.json({ ok: true, ...out });
  } catch {
    return bad(res, 'Error cargando meta', 500);
  }
});

// POST /api/admin/pv -> crear
router.post('/pv', async (req, res) => {
  try {
    const Departamento = normText(req.body?.Departamento);
    const Municipio = normText(req.body?.Municipio);
    const Direccion = normText(req.body?.Direccion);
    const Barrio = normText(req.body?.Barrio) || '...';
    const Latitud = normNum(req.body?.Latitud);
    const Longitud = normNum(req.body?.Longitud);
    const num_whatsapp = normText(req.body?.num_whatsapp) || null;
    const URL_image = normText(req.body?.URL_image) || null;

    if (!Departamento) return bad(res, 'Departamento es obligatorio');
    if (!Municipio) return bad(res, 'Municipio es obligatorio');
    if (!Direccion) return bad(res, 'Direccion es obligatoria');
    if (Latitud === null) return bad(res, 'Latitud es obligatoria');
    if (Longitud === null) return bad(res, 'Longitud es obligatoria');
    if (!Barrio) return bad(res, 'Barrio es obligatorio');

    const payload = {
      Departamento,
      Municipio,
      Direccion,
      Latitud,
      Longitud,
      Barrio,
      num_whatsapp,
      URL_image,
    };

    const { data, error } = await supabase
      .from('Coordenadas_PV')
      .insert([payload])
      .select('*')
      .single();

    if (error) return bad(res, error.message, 400);
    return res.json({ ok: true, item: data });
  } catch {
    return bad(res, 'Error creando punto de venta', 500);
  }
});

// PUT /api/admin/pv/:id -> editar
router.put('/pv/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'ID inválido');

    const Departamento = normText(req.body?.Departamento);
    const Municipio = normText(req.body?.Municipio);
    const Direccion = normText(req.body?.Direccion);
    const Barrio = normText(req.body?.Barrio) || '...';
    const Latitud = normNum(req.body?.Latitud);
    const Longitud = normNum(req.body?.Longitud);
    const num_whatsapp = normText(req.body?.num_whatsapp) || null;
    const URL_image = normText(req.body?.URL_image) || null;

    if (!Departamento) return bad(res, 'Departamento es obligatorio');
    if (!Municipio) return bad(res, 'Municipio es obligatorio');
    if (!Direccion) return bad(res, 'Direccion es obligatoria');
    if (Latitud === null) return bad(res, 'Latitud es obligatoria');
    if (Longitud === null) return bad(res, 'Longitud es obligatoria');
    if (!Barrio) return bad(res, 'Barrio es obligatorio');

    const payload = {
      Departamento,
      Municipio,
      Direccion,
      Latitud,
      Longitud,
      Barrio,
      num_whatsapp,
      URL_image,
    };

    const { data, error } = await supabase
      .from('Coordenadas_PV')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return bad(res, error.message, 400);
    return res.json({ ok: true, item: data });
  } catch {
    return bad(res, 'Error actualizando punto de venta', 500);
  }
});

// DELETE /api/admin/pv/:id -> borrar
router.delete('/pv/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'ID inválido');

    const { error } = await supabase
      .from('Coordenadas_PV')
      .delete()
      .eq('id', id);

    if (error) return bad(res, error.message, 400);

    return res.json({ ok: true });
  } catch {
    return bad(res, 'Error eliminando punto de venta', 500);
  }
});

/**
 * ✅ Ventas por PV usando BARRIO como llave
 * GET /api/admin/pv/:id/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Requisito: pedidos.puntoventa debe ser EXACTAMENTE el Coordenadas_PV.Barrio
 *
 * Suma desde pedido_items (cantidad + total) uniendo a pedidos por pedido_id
 */
router.get('/pv/:id/sales', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, 'ID inválido');

    // 1) Traer el PV y su Barrio (llave)
    const { data: pv, error: pvErr } = await supabase
      .from('Coordenadas_PV')
      .select('id, Barrio')
      .eq('id', id)
      .single();

    if (pvErr) return bad(res, pvErr.message, 400);

    const barrio = normText(pv?.Barrio);
    if (!barrio) return bad(res, 'PV sin Barrio válido');

    // 2) Rango fechas (opcional)
    const fromISO = parseDateOnlyToISOStart(req.query.from);
    const toISOStart = parseDateOnlyToISOStart(req.query.to);
    // Para incluir todo el día "to", usamos < (to + 1 día)
    const toISOExclusive = toISOStart ? addDaysISO(toISOStart, 1) : null;

    // 3) Query a pedido_items con join a pedidos
    // Nota: hacemos el agregado en Node para evitar peleas con group_by en Supabase JS
    let q = supabase
      .from('pedido_items')
      .select('menu_id, nombre, tipo, cantidad, total, pedidos!inner(puntoventa, created_at)')
      .eq('pedidos.puntoventa', barrio);

    if (fromISO) q = q.gte('pedidos.created_at', fromISO);
    if (toISOExclusive) q = q.lt('pedidos.created_at', toISOExclusive);

    const { data: rows, error } = await q;
    if (error) return bad(res, error.message, 500);

    const agg = new Map(); // menu_id -> { product_id, name, tipo, qty, revenue }
    let qtyTotal = 0;
    let revTotal = 0;

    for (const r of rows || []) {
      const menuId = Number(r.menu_id);
      const name = normText(r.nombre) || `Producto ${menuId}`;
      const tipo = Number(r.tipo ?? 0);
      const qty = Number(r.cantidad ?? 0);
      const revenue = Number(r.total ?? 0);

      qtyTotal += qty;
      revTotal += revenue;

      if (!agg.has(menuId)) {
        agg.set(menuId, { product_id: menuId, name, tipo, qty: 0, revenue: 0 });
      }
      const it = agg.get(menuId);
      it.qty += qty;
      it.revenue += revenue;

      // si por alguna razón viene nombre vacío en una fila, conserva el mejor
      if (!it.name && name) it.name = name;
      if (!it.tipo && tipo) it.tipo = tipo;
    }

    const items = Array.from(agg.values())
      .sort((a, b) => (b.revenue - a.revenue) || (b.qty - a.qty));

    return res.json({
      ok: true,
      pv: { id, barrio },
      from: req.query.from || null,
      to: req.query.to || null,
      totals: { qty: qtyTotal, revenue: revTotal },
      items, // [{ product_id, name, tipo, qty, revenue }]
      note: rows?.length
        ? null
        : 'Sin filas en pedido_items para este PV (o el puntoventa no coincide con el Barrio).',
    });
  } catch (e) {
    return bad(res, 'Error calculando ventas por PV', 500);
  }
});

module.exports = router;
