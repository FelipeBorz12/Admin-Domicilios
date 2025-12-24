// src/shiftsAdmin.js
"use strict";

const express = require("express");
const supabase = require("./supabase");
const router = express.Router();

function bad(res, msg, code = 400) {
  return res.status(code).json({ ok: false, error: msg });
}

router.get("/shifts/active", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("shifts")
      .select(
        "id, store_id, opened_by, opened_at, closed_at, notes, admin_name, sede_name, expires_at, warning_sent_at, extended_minutes"
      )
      .is("closed_at", null)
      .order("opened_at", { ascending: false });

    if (error) return bad(res, error.message, 500);
    return res.json({ ok: true, items: data || [] });
  } catch (e) {
    return bad(res, "Error consultando turnos activos", 500);
  }
});

module.exports = router;
