// routes/auth.js
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db       = require('../db');
const authMW   = require('../middleware/auth');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'landlord' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const exists = await db.users.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({
      _id: uuid(), name, email: email.toLowerCase(),
      password: hash, phone: phone || '', role,
      createdAt: new Date().toISOString(), active: true
    });
    const { password: _, ...safe } = user;
    res.status(201).json({ token: sign(user._id), user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _, ...safe } = user;
    res.json({ token: sign(user._id), user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMW, async (req, res) => {
  const { password: _, ...safe } = req.user;
  res.json({ user: safe });
});

// PUT /api/auth/profile
router.put('/profile', authMW, async (req, res) => {
  try {
    const { name, phone } = req.body;
    await db.users.update({ _id: req.user._id }, { $set: { name, phone, updatedAt: new Date().toISOString() } });
    const updated = await db.users.findOne({ _id: req.user._id });
    const { password: _, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
