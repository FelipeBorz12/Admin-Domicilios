"use strict";

const express = require("express");
const supabase = require("./supabase");
const router = express.Router();

// Helpers
function bad(res, msg, code = 400) {
  return res.status(code).json({ ok: false, error: msg });
}
function normText(v) {
  return String(v ?? "").trim();
}
function normNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDateOnlyToISOStart(dateStr) {
  const s = normText(dateStr);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return `${s}T00:00:00.000Z`;
}
function addDaysISO(iso, days) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

// GET /api/admin/pv -> lista completa
router.get("/pv", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Coordenadas_PV")
      .select("*")
      .order("Departamento", { ascending: true })
      .order("Municipio", { ascending: true })
      .order("Barrio", { ascending: true });

    if (error) return bad(res, error.message, 500);
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return bad(res, "Error listando puntos de venta", 500);
  }
});

// GET /api/admin/pv/meta -> departamentos/municipios (para dropdowns)
router.get("/pv/meta", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Coordenadas_PV")
      .select("Departamento, Municipio");

    if (error) return bad(res, error.message, 500);

    const deps = new Set();
    const munByDep = new Map();

    for (const r of data || []) {
      const dep = String(r.Departamento || "").trim();
      const muni = String(r.Municipio || "").trim();
      if (dep) deps.add(dep);
      if (dep && muni) {
        if (!munByDep.has(dep)) munByDep.set(dep, new Set());
        munByDep.get(dep).add(muni);
      }
    }

    return res.json({
      ok: true,
      departamentos: Array.from(deps).sort((a, b) => a.localeCompare(b, "es")),
      municipiosByDepartamento: Object.fromEntries(
        Array.from(munByDep.entries()).map(([dep, set]) => [
          dep,
          Array.from(set).sort((a, b) => a.localeCompare(b, "es")),
        ])
      ),
    });
  } catch (e) {
    return bad(res, "Error cargando meta", 500);
  }
});

// POST /api/admin/pv -> crear
router.post("/pv", async (req, res) => {
  try {
    const Departamento = normText(req.body?.Departamento);
    const Municipio = normText(req.body?.Municipio);
    const Direccion = normText(req.body?.Direccion);
    const Barrio = normText(req.body?.Barrio) || "...";
    const Latitud = normNum(req.body?.Latitud);
    const Longitud = normNum(req.body?.Longitud);
    const num_whatsapp = normText(req.body?.num_whatsapp) || null;
    const URL_image = normText(req.body?.URL_image) || null;

    if (!Departamento) return bad(res, "Departamento es obligatorio");
    if (!Municipio) return bad(res, "Municipio es obligatorio");
    if (!Direccion) return bad(res, "Direccion es obligatoria");
    if (Latitud === null) return bad(res, "Latitud es obligatoria");
    if (Longitud === null) return bad(res, "Longitud es obligatoria");
    if (!Barrio) return bad(res, "Barrio es obligatorio");

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
      .from("Coordenadas_PV")
      .insert([payload])
      .select("*")
      .single();

    if (error) return bad(res, error.message, 400);
    return res.json({ ok: true, item: data });
  } catch (e) {
    return bad(res, "Error creando punto de venta", 500);
  }
});

// PUT /api/admin/pv/:id -> editar
router.put("/pv/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "ID inválido");

    const Departamento = normText(req.body?.Departamento);
    const Municipio = normText(req.body?.Municipio);
    const Direccion = normText(req.body?.Direccion);
    const Barrio = normText(req.body?.Barrio) || "...";
    const Latitud = normNum(req.body?.Latitud);
    const Longitud = normNum(req.body?.Longitud);
    const num_whatsapp = normText(req.body?.num_whatsapp) || null;
    const URL_image = normText(req.body?.URL_image) || null;

    if (!Departamento) return bad(res, "Departamento es obligatorio");
    if (!Municipio) return bad(res, "Municipio es obligatorio");
    if (!Direccion) return bad(res, "Direccion es obligatoria");
    if (Latitud === null) return bad(res, "Latitud es obligatoria");
    if (Longitud === null) return bad(res, "Longitud es obligatoria");
    if (!Barrio) return bad(res, "Barrio es obligatorio");

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
      .from("Coordenadas_PV")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return bad(res, error.message, 400);
    return res.json({ ok: true, item: data });
  } catch (e) {
    return bad(res, "Error actualizando punto de venta", 500);
  }
});

// DELETE /api/admin/pv/:id -> borrar
router.delete("/pv/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "ID inválido");

    const { error } = await supabase.from("Coordenadas_PV").delete().eq("id", id);
    if (error) return bad(res, error.message, 400);

    return res.json({ ok: true });
  } catch (e) {
    return bad(res, "Error eliminando punto de venta", 500);
  }
});

/**
 * ✅ Ventas globales (summary)
 * GET /api/admin/pv/sales/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Usa pedido_items.created_at
 */
router.get("/pv/sales/summary", async (req, res) => {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const fromISO = parseDateOnlyToISOStart(from);
    const toISOStart = parseDateOnlyToISOStart(to);
    const toExclusiveISO = toISOStart ? addDaysISO(toISOStart, 1) : null;

    let q = supabase.from("pedido_items").select("qty, line_total, created_at");

    if (fromISO) q = q.gte("created_at", fromISO);
    if (toExclusiveISO) q = q.lt("created_at", toExclusiveISO);

    const { data: rows, error } = await q;
    if (error) return bad(res, error.message, 500);

    let qtyTotal = 0;
    let revTotal = 0;

    for (const r of rows || []) {
      qtyTotal += Number(r.qty ?? 0);
      revTotal += Number(r.line_total ?? 0);
    }

    return res.json({
      ok: true,
      from: from || null,
      to: to || null,
      totals: { qty: qtyTotal, revenue: revTotal },
    });
  } catch (e) {
    return bad(res, "Error calculando ventas globales", 500);
  }
});

/**
 * ✅ Ventas por PV (date-only)
 * GET /api/admin/pv/:id/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Usa pedido_items.pv_id = pv.id y pedido_items.created_at
 */
router.get("/pv/:id/sales", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "ID inválido");

    const fromISO = parseDateOnlyToISOStart(req.query.from);
    const toISOStart = parseDateOnlyToISOStart(req.query.to);
    const toExclusiveISO = toISOStart ? addDaysISO(toISOStart, 1) : null;

    let q = supabase
      .from("pedido_items")
      .select("menu_id, nombre_snapshot, qty, line_total, created_at, pv_id")
      .eq("pv_id", id);

    if (fromISO) q = q.gte("created_at", fromISO);
    if (toExclusiveISO) q = q.lt("created_at", toExclusiveISO);

    const { data: rows, error } = await q;
    if (error) return bad(res, error.message, 500);

    const agg = new Map();
    let qtyTotal = 0;
    let revTotal = 0;

    for (const r of rows || []) {
      const menuId = Number(r.menu_id);
      const name = normText(r.nombre_snapshot) || `Producto ${menuId}`;
      const qty = Number(r.qty ?? 0);
      const revenue = Number(r.line_total ?? 0);

      qtyTotal += qty;
      revTotal += revenue;

      if (!agg.has(menuId)) {
        agg.set(menuId, { product_id: menuId, name, qty: 0, revenue: 0 });
      }
      const it = agg.get(menuId);
      it.qty += qty;
      it.revenue += revenue;
      if (!it.name && name) it.name = name;
    }

    const items = Array.from(agg.values()).sort(
      (a, b) => b.revenue - a.revenue || b.qty - a.qty
    );

    // barrio (solo para mostrar)
    const { data: pv, error: pvErr } = await supabase
      .from("Coordenadas_PV")
      .select("id, Barrio")
      .eq("id", id)
      .single();

    return res.json({
      ok: true,
      pv: { id, barrio: pvErr ? null : pv?.Barrio || null },
      from: req.query.from || null,
      to: req.query.to || null,
      totals: { qty: qtyTotal, revenue: revTotal },
      items,
    });
  } catch (e) {
    return bad(res, "Error calculando ventas por PV", 500);
  }
});

/**
 * ✅ Ventas por PV (timestamp) - para turno
 * GET /api/admin/pv/:id/sales-ts?from_ts=ISO&to_ts=ISO
 */
router.get("/pv/:id/sales-ts", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return bad(res, "ID inválido");

    const from_ts = normText(req.query.from_ts);
    const to_ts = normText(req.query.to_ts);

    // barrio (solo para mostrar)
    const { data: pv, error: pvErr } = await supabase
      .from("Coordenadas_PV")
      .select("id, Barrio")
      .eq("id", id)
      .single();

    if (pvErr) return bad(res, pvErr.message, 400);

    let q = supabase
      .from("pedido_items")
      .select("menu_id, nombre_snapshot, qty, line_total, created_at, pv_id")
      .eq("pv_id", id);

    if (from_ts) q = q.gte("created_at", from_ts);
    if (to_ts) q = q.lt("created_at", to_ts);

    const { data: rows, error } = await q;
    if (error) return bad(res, error.message, 500);

    const agg = new Map();
    let qtyTotal = 0;
    let revTotal = 0;

    for (const r of rows || []) {
      const menuId = Number(r.menu_id);
      const name = normText(r.nombre_snapshot) || `Producto ${menuId}`;
      const qty = Number(r.qty ?? 0);
      const revenue = Number(r.line_total ?? 0);

      qtyTotal += qty;
      revTotal += revenue;

      if (!agg.has(menuId)) {
        agg.set(menuId, { product_id: menuId, name, qty: 0, revenue: 0 });
      }
      const it = agg.get(menuId);
      it.qty += qty;
      it.revenue += revenue;
      if (!it.name && name) it.name = name;
    }

    const items = Array.from(agg.values()).sort(
      (a, b) => b.revenue - a.revenue || b.qty - a.qty
    );

    return res.json({
      ok: true,
      pv: { id: pv.id, barrio: pv.Barrio },
      from_ts: req.query.from_ts || null,
      to_ts: req.query.to_ts || null,
      totals: { qty: qtyTotal, revenue: revTotal },
      items,
    });
  } catch (e) {
    return bad(res, "Error calculando ventas por turno", 500);
  }
});

module.exports = router;
