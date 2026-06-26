// server.js — OneTenant Full Stack App
// Serves both the API and the frontend from one process
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ─── CORS ───
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/tenants',       require('./routes/tenants'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/notifications', require('./routes/notifications'));

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'OneTenant', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ─── Serve frontend (landing page + dashboard) ───
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏠 OneTenant running on port ${PORT}`);
  console.log(`   Health: /api/health`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
