// routes/payments.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET all payments (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { tenantId, month, year, status } = req.query;
    const query = { landlordId: req.user._id };
    if (tenantId) query.tenantId = tenantId;
    if (status)   query.status = status;
    if (month && year) {
      const from = new Date(year, month - 1, 1).toISOString();
      const to   = new Date(year, month, 1).toISOString();
      query.createdAt = { $gte: from, $lt: to };
    }
    const payments = await db.payments.find(query).sort({ createdAt: -1 });

    // Enrich with tenant name
    const enriched = await Promise.all(payments.map(async (p) => {
      const tenant = await db.tenants.findOne({ _id: p.tenantId });
      return { ...p, tenantName: tenant?.name || '', tenantPhone: tenant?.phone || '' };
    }));
    res.json({ payments: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST record a payment
router.post('/', auth, async (req, res) => {
  try {
    const { tenantId, amount, method, month, year, notes, referenceId } = req.body;
    if (!tenantId || !amount) return res.status(400).json({ error: 'tenantId and amount required' });

    const tenant = await db.tenants.findOne({ _id: tenantId, landlordId: req.user._id });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const now = new Date();
    const payMonth = Number(month) || (now.getMonth() + 1);
    const payYear  = Number(year)  || now.getFullYear();
    const paidAmount = Number(amount);
    const isFullPay = paidAmount >= tenant.monthlyRent;

    const payment = await db.payments.insert({
      _id: uuid(), landlordId: req.user._id, tenantId,
      tenantName: tenant.name, propertyId: tenant.propertyId,
      amount: paidAmount, expectedAmount: tenant.monthlyRent,
      balance: Math.max(0, tenant.monthlyRent - paidAmount),
      method: method || 'cash',
      status: isFullPay ? 'paid' : 'partial',
      month: payMonth, year: payYear,
      notes: notes || '', referenceId: referenceId || '',
      createdAt: new Date().toISOString()
    });

    // Create notification
    await db.notifications.insert({
      _id: uuid(), landlordId: req.user._id, tenantId,
      type: isFullPay ? 'payment_received' : 'payment_partial',
      title: isFullPay ? `₹${paidAmount.toLocaleString('en-IN')} received` : `Partial payment ₹${paidAmount.toLocaleString('en-IN')}`,
      message: `${tenant.name} — ${isFullPay ? 'Full' : 'Partial'} rent for ${payMonth}/${payYear} via ${method}`,
      read: false, createdAt: new Date().toISOString()
    });

    res.status(201).json({ payment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET analytics summary
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    const allTenants = await db.tenants.find({ landlordId: req.user._id, status: 'active' });
    const totalExpected = allTenants.reduce((s, t) => s + (t.monthlyRent || 0), 0);

    const monthFrom = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const monthTo   = new Date(currentYear, currentMonth, 1).toISOString();
    const monthPayments = await db.payments.find({
      landlordId: req.user._id,
      createdAt: { $gte: monthFrom, $lt: monthTo }
    });

    const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
    const paidTenantIds  = [...new Set(monthPayments.filter(p => p.status === 'paid').map(p => p.tenantId))];
    const overdueTenants = allTenants.filter(t => !paidTenantIds.includes(t._id));

    // 6-month trend
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const from = new Date(y, m - 1, 1).toISOString();
      const to   = new Date(y, m, 1).toISOString();
      const pays = await db.payments.find({ landlordId: req.user._id, createdAt: { $gte: from, $lt: to } });
      const total = pays.reduce((s, p) => s + p.amount, 0);
      trend.push({ month: m, year: y, collected: total, label: d.toLocaleString('default', { month: 'short' }) });
    }

    // Property breakdown
    const properties = await db.properties.find({ landlordId: req.user._id });
    const propertyStats = await Promise.all(properties.map(async (prop) => {
      const propTenants = allTenants.filter(t => t.propertyId === prop._id);
      const propExpected = propTenants.reduce((s, t) => s + t.monthlyRent, 0);
      const propPaid = monthPayments
        .filter(p => p.propertyId === prop._id)
        .reduce((s, p) => s + p.amount, 0);
      return { propertyId: prop._id, name: prop.name, expected: propExpected, collected: propPaid, rate: propExpected ? Math.round((propPaid / propExpected) * 100) : 0 };
    }));

    res.json({
      currentMonth, currentYear, totalExpected, totalCollected,
      totalPending: Math.max(0, totalExpected - totalCollected),
      collectionRate: totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0,
      activeTenants: allTenants.length,
      overdueTenants: overdueTenants.length,
      trend, propertyStats,
      platformRevenue: allTenants.length * 49
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
