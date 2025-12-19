"use strict";

const express = require("express");
const supabase = require("./supabase"); // ✅ ojo: es ./supabase (misma carpeta)

const router = express.Router();

// GET /api/admin/menu
router.get("/menu", async (req, res) => {
  try {
    const { data, error } = await supabase.from("menu").select("*").order("id", { ascending: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Error listando menú" });
  }
});

// POST /api/admin/menu
router.post("/menu", async (req, res) => {
  try {
    const body = req.body || {};

    const Nombre = String(body.Nombre || "").trim();
    const Descripcion = String(body.Descripcion || "").trim();
    const tipo = Number(body.tipo || 0);

    if (!Nombre) return res.status(400).json({ ok: false, error: "Nombre es obligatorio" });
    if (!Descripcion) return res.status(400).json({ ok: false, error: "Descripcion es obligatoria" });
    if (!Number.isFinite(tipo) || tipo <= 0) return res.status(400).json({ ok: false, error: "Tipo inválido" });

    const payload = {
      Nombre,
      Descripcion,
      tipo,
      Activo: Number(body.Activo ?? 1),
      PrecioOriente: Number(body.PrecioOriente ?? 0),
      Cantidad: Number(body.Cantidad ?? 0),
      PrecioRestoPais: Number(body.PrecioRestoPais ?? 0),
      PrecioAreaMetrop: Number(body.PrecioAreaMetrop ?? 0),
      imagen: String(body.imagen ?? ""),
    };

    const { data, error } = await supabase.from("menu").insert([payload]).select("*").single();
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true, item: data });
  } catch {
    return res.status(500).json({ ok: false, error: "Error creando producto" });
  }
});

// PUT /api/admin/menu/:id
router.put("/menu/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

    const body = req.body || {};

    // Validación mínima
    const Nombre = String(body.Nombre || "").trim();
    const Descripcion = String(body.Descripcion || "").trim();
    const tipo = Number(body.tipo || 0);

    if (!Nombre) return res.status(400).json({ ok: false, error: "Nombre es obligatorio" });
    if (!Descripcion) return res.status(400).json({ ok: false, error: "Descripcion es obligatoria" });
    if (!Number.isFinite(tipo) || tipo <= 0) return res.status(400).json({ ok: false, error: "Tipo inválido" });

    const payload = {
      Nombre,
      Descripcion,
      tipo,
      Activo: Number(body.Activo ?? 0),
      PrecioOriente: Number(body.PrecioOriente ?? 0),
      Cantidad: Number(body.Cantidad ?? 0),
      PrecioRestoPais: Number(body.PrecioRestoPais ?? 0),
      PrecioAreaMetrop: Number(body.PrecioAreaMetrop ?? 0),
      imagen: String(body.imagen ?? ""),
    };

    const { data, error } = await supabase.from("menu").update(payload).eq("id", id).select("*").single();
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true, item: data });
  } catch {
    return res.status(500).json({ ok: false, error: "Error actualizando producto" });
  }
});

// DELETE /api/admin/menu/:id
router.delete("/menu/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

    const { error } = await supabase.from("menu").delete().eq("id", id);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Error eliminando producto" });
  }
});

// DELETE /api/admin/menu/type/:tipo  (borra categoría + productos)
router.delete("/menu/type/:tipo", async (req, res) => {
  try {
    const tipo = Number(req.params.tipo);
    if (!Number.isFinite(tipo) || tipo <= 0) return res.status(400).json({ ok: false, error: "Tipo inválido" });

    const { error } = await supabase.from("menu").delete().eq("tipo", tipo);
    if (error) return res.status(400).json({ ok: false, error: error.message });

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: "Error eliminando categoría" });
  }
});

module.exports = router;
