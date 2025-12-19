'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { authRouter, requireAdmin } = require('./auth');
const landingAdminRouter = require('./landingAdmin');
const menuAdminRoutes = require('./menuAdmin');
const pvAdminRoutes = require('./pvAdmin');
const teamAdminRoutes = require('./teamAdmin');


const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos públicos (public/)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Auth API
app.use('/api/auth', authRouter);

app.use("/api/admin", requireAdmin, menuAdminRoutes);

// Admin API (protegida)
app.use('/api/admin', requireAdmin, landingAdminRouter);

app.use('/api/admin', requireAdmin, pvAdminRoutes);

app.use('/api/admin', requireAdmin, teamAdminRoutes);


// ========= PÁGINAS PROTEGIDAS =========
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'admin.html'));
});

app.get('/admin.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'admin.js'));
});

// ✅ RUTAS QUE TE FALTAN (para /admin/appearance)
app.get('/admin/appearance', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'appearance.html'));
});

app.get('/admin/appearance.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'appearance.js'));
});

app.get('/admin/inventory', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..','protected','inventory.html'));
});

app.get('/admin/inventory.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..','protected','inventory.js'));
});

// ✅ PÁGINA PUNTOS DE VENTA (UBICACIONES)
app.get('/admin/locations', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'locations.html'));
});

app.get('/admin/locations.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'locations.js'));
});

app.get('/admin/team', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'team.html'));
});

app.get('/admin/team.js', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'team.js'));
});


// (Opcional) compatibilidad si alguna vez entraste por /appearance
app.get('/appearance', requireAdmin, (req, res) => res.redirect('/admin/appearance'));
app.get('/appearance.js', requireAdmin, (req, res) => res.redirect('/admin/appearance.js'));

app.get('/', (req, res) => res.redirect('/login.html'));

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});


