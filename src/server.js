'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');

const { authRouter, requireAdmin } = require('./auth');
const landingAdminRouter = require('./landingAdmin');
const menuAdminRoutes = require('./menuAdmin');
const pvAdminRoutes = require('./pvAdmin');
const teamAdminRoutes = require('./teamAdmin');
const pvAdmin = require('./pvAdmin');
const shiftsAdmin = require('./shiftsAdmin');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// Archivos públicos
// =====================
app.use(express.static(path.join(__dirname, '..', 'public')));

// =====================
// Auth API (pública)
// =====================
app.use('/api/auth', authRouter);

// =====================
// Admin API (protegida)
// =====================
app.use('/api/admin', requireAdmin, menuAdminRoutes);
app.use('/api/admin', requireAdmin, landingAdminRouter);
app.use('/api/admin', requireAdmin, pvAdminRoutes);
app.use('/api/admin', requireAdmin, teamAdminRoutes);
app.use('/api/admin', requireAdmin, pvAdmin);
app.use('/api/admin', requireAdmin, shiftsAdmin);

// =====================================================
// PÁGINAS DEL PANEL (URLS LIMPIAS, SIN .html)
// =====================================================

// Página principal del panel
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'admin.html'));
});

// Apariencia
app.get('/admin/appearance', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'appearance.html'));
});

// Inventario
app.get('/admin/inventory', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'inventory.html'));
});

// Ubicaciones
app.get('/admin/locations', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'locations.html'));
});

// Equipo
app.get('/admin/team', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'protected', 'team.html'));
});

// =====================================================
// ARCHIVOS JS/CSS DEL PANEL (NO EXPUESTOS POR URL)
// =====================================================
//
// Solo se sirven si:
// - El usuario tiene sesión
// - El archivo existe dentro de protected
//
app.get('/admin/assets/:file', requireAdmin, (req, res) => {
  const file = req.params.file;

  // Seguridad básica: solo permitir archivos conocidos
  const allowed = [
    'admin.js',
    'appearance.js',
    'inventory.js',
    'locations.js',
    'team.js',
  ];

  if (!allowed.includes(file)) {
    return res.status(404).end();
  }

  res.sendFile(path.join(__dirname, '..', 'protected', file));
});

// =====================================================
// REDIRECCIONES DE COMPATIBILIDAD (opcional)
// =====================================================
app.get('/appearance', (req, res) => res.redirect('/admin/appearance'));
app.get('/inventory', (req, res) => res.redirect('/admin/inventory'));
app.get('/team', (req, res) => res.redirect('/admin/team'));

// =====================================================
// ROOT
// =====================================================
app.get('/', (req, res) => res.redirect('/login.html'));

// =====================================================
// 404 limpio
// =====================================================
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
