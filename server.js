// server.js — RentEase
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'RentEase', version: '2.0.0', ts: new Date().toISOString() });
});

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Marketing website at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Rental management app at /app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏠 RentEase v2.0 on port ${PORT}`);
  console.log(`   Website : /`);
  console.log(`   App     : /app`);
  console.log(`   Health  : /api/health\n`);
});

module.exports = app;
