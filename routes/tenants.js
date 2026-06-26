// routes/tenants.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET all tenants
router.get('/', auth, async (req, res) => {
  try {
    const { status, propertyId } = req.query;
    const query = { landlordId: req.user._id };
    if (status) query.status = status;
    if (propertyId) query.propertyId = propertyId;
    const tenants = await db.tenants.find(query).sort({ createdAt: -1 });

    // Enrich with property & payment info
    const enriched = await Promise.all(tenants.map(async (t) => {
      const property = await db.properties.findOne({ _id: t.propertyId });
      const unit     = await db.units.findOne({ _id: t.unitId });
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const paid = await db.payments.findOne({
        tenantId: t._id, status: 'paid',
        createdAt: { $gte: monthStart }
      });
      return {
        ...t, propertyName: property?.name || '',
        unitNumber: unit?.unitNumber || '',
        currentMonthPaid: !!paid
      };
    }));
    res.json({ tenants: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create tenant
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, propertyId, unitId, monthlyRent, securityDeposit, leaseStart, leaseEnd, rentDueDay } = req.body;
    if (!name || !phone || !propertyId) return res.status(400).json({ error: 'name, phone, propertyId required' });

    const tenant = await db.tenants.insert({
      _id: uuid(), landlordId: req.user._id,
      name, email: email || '', phone, propertyId,
      unitId: unitId || null,
      monthlyRent: Number(monthlyRent) || 0,
      securityDeposit: Number(securityDeposit) || 0,
      leaseStart: leaseStart || new Date().toISOString(),
      leaseEnd: leaseEnd || null,
      rentDueDay: Number(rentDueDay) || 1,
      status: 'active',
      subscriptionStatus: 'unpaid',
      createdAt: new Date().toISOString()
    });

    // Mark unit as occupied
    if (unitId) {
      await db.units.update({ _id: unitId }, { $set: { status: 'occupied', tenantId: tenant._id } });
    }

    // Create welcome notification
    await db.notifications.insert({
      _id: uuid(), landlordId: req.user._id, tenantId: tenant._id,
      type: 'tenant_added', title: 'New tenant added',
      message: `${name} added to your property. Subscription fee: ₹49/month.`,
      read: false, createdAt: new Date().toISOString()
    });

    res.status(201).json({ tenant });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single tenant
router.get('/:id', auth, async (req, res) => {
  try {
    const tenant = await db.tenants.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!tenant) return res.status(404).json({ error: 'Not found' });
    const payments = await db.payments.find({ tenantId: tenant._id }).sort({ createdAt: -1 });
    const property = await db.properties.findOne({ _id: tenant.propertyId });
    const unit     = await db.units.findOne({ _id: tenant.unitId });
    res.json({ tenant: { ...tenant, payments, propertyName: property?.name, unitNumber: unit?.unitNumber } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update tenant
router.put('/:id', auth, async (req, res) => {
  try {
    const tenant = await db.tenants.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!tenant) return res.status(404).json({ error: 'Not found' });
    await db.tenants.update({ _id: req.params.id }, { $set: { ...req.body, updatedAt: new Date().toISOString() } });
    const updated = await db.tenants.findOne({ _id: req.params.id });
    res.json({ tenant: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE (vacate) tenant
router.delete('/:id', auth, async (req, res) => {
  try {
    const tenant = await db.tenants.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!tenant) return res.status(404).json({ error: 'Not found' });
    await db.tenants.update({ _id: req.params.id }, { $set: { status: 'vacated', vacatedAt: new Date().toISOString() } });
    if (tenant.unitId) {
      await db.units.update({ _id: tenant.unitId }, { $set: { status: 'vacant', tenantId: null } });
    }
    res.json({ message: 'Tenant vacated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
