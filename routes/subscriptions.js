// routes/subscriptions.js — Razorpay ₹49/tenant billing
const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const db      = require('../db');
const auth    = require('../middleware/auth');

// Razorpay instance (lazy-loaded so app works without keys in dev)
let razorpay = null;
const getRazorpay = () => {
  if (!razorpay && process.env.RAZORPAY_KEY_ID !== 'rzp_test_YOUR_KEY_HERE') {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpay;
};

// POST /api/subscriptions/create-order — create Razorpay order for ₹49
router.post('/create-order', auth, async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

    const tenant = await db.tenants.findOne({ _id: tenantId, landlordId: req.user._id });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const AMOUNT_PAISE = 4900; // ₹49 in paise

    // Mock order if Razorpay not configured (development mode)
    const rz = getRazorpay();
    if (!rz) {
      const mockOrder = {
        id: 'order_mock_' + uuid().slice(0, 8),
        amount: AMOUNT_PAISE, currency: 'INR',
        receipt: `receipt_${tenantId.slice(0, 8)}`,
        status: 'created'
      };
      return res.json({ order: mockOrder, keyId: 'rzp_test_demo', tenant: { name: tenant.name, phone: tenant.phone } });
    }

    const order = await rz.orders.create({
      amount: AMOUNT_PAISE, currency: 'INR',
      receipt: `receipt_${tenantId.slice(0, 8)}`,
      notes: { tenantId, landlordId: req.user._id, tenantName: tenant.name }
    });

    res.json({ order, keyId: process.env.RAZORPAY_KEY_ID, tenant: { name: tenant.name, phone: tenant.phone } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/subscriptions/verify — verify payment after Razorpay callback
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tenantId } = req.body;

    let verified = false;
    const rz = getRazorpay();
    if (rz) {
      const crypto = require('crypto');
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body).digest('hex');
      verified = expectedSig === razorpay_signature;
    } else {
      verified = true; // Dev mode: always pass
    }

    if (!verified) return res.status(400).json({ error: 'Payment verification failed' });

    // Compute next due date (1 month from now)
    const now = new Date();
    const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    // Record subscription
    const sub = await db.subscriptions.insert({
      _id: uuid(), landlordId: req.user._id, tenantId,
      amount: 49, razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'active', paidAt: now.toISOString(),
      nextDueAt: nextDue.toISOString(),
      createdAt: now.toISOString()
    });

    // Update tenant subscription status
    await db.tenants.update({ _id: tenantId }, { $set: { subscriptionStatus: 'active', subscriptionExpiry: nextDue.toISOString() } });

    res.json({ subscription: sub, message: 'Subscription activated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/subscriptions — list all subscriptions for landlord
router.get('/', auth, async (req, res) => {
  try {
    const subs = await db.subscriptions.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    const enriched = await Promise.all(subs.map(async (s) => {
      const tenant = await db.tenants.findOne({ _id: s.tenantId });
      return { ...s, tenantName: tenant?.name || '' };
    }));
    res.json({ subscriptions: enriched, totalMonthlyRevenue: enriched.filter(s => s.status === 'active').length * 49 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
