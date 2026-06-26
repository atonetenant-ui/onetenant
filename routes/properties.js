// routes/properties.js
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET all properties for landlord
router.get('/', auth, async (req, res) => {
  try {
    const properties = await db.properties.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    // Attach unit counts
    const enriched = await Promise.all(properties.map(async (p) => {
      const units = await db.units.find({ propertyId: p._id });
      const occupiedUnits = units.filter(u => u.status === 'occupied');
      return { ...p, totalUnits: units.length, occupiedUnits: occupiedUnits.length };
    }));
    res.json({ properties: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create property
router.post('/', auth, async (req, res) => {
  try {
    const { name, address, city, state, pincode, type, totalUnits, monthlyRent } = req.body;
    if (!name || !address || !city) return res.status(400).json({ error: 'name, address, city required' });
    const property = await db.properties.insert({
      _id: uuid(), landlordId: req.user._id,
      name, address, city, state: state || 'Karnataka',
      pincode: pincode || '', type: type || 'residential',
      totalUnits: Number(totalUnits) || 1,
      monthlyRent: Number(monthlyRent) || 0,
      status: 'active', createdAt: new Date().toISOString()
    });
    // Auto-create units
    const unitDocs = [];
    for (let i = 1; i <= (Number(totalUnits) || 1); i++) {
      unitDocs.push({
        _id: uuid(), propertyId: property._id,
        landlordId: req.user._id,
        unitNumber: `Unit ${i}`, floor: Math.ceil(i / 4),
        bedrooms: 1, bathrooms: 1,
        monthlyRent: Number(monthlyRent) || 0,
        status: 'vacant', createdAt: new Date().toISOString()
      });
    }
    await Promise.all(unitDocs.map(u => db.units.insert(u)));
    res.status(201).json({ property });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single property
router.get('/:id', auth, async (req, res) => {
  try {
    const property = await db.properties.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!property) return res.status(404).json({ error: 'Not found' });
    const units = await db.units.find({ propertyId: property._id });
    res.json({ property: { ...property, units } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update property
router.put('/:id', auth, async (req, res) => {
  try {
    const prop = await db.properties.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!prop) return res.status(404).json({ error: 'Not found' });
    await db.properties.update({ _id: req.params.id }, { $set: { ...req.body, updatedAt: new Date().toISOString() } });
    const updated = await db.properties.findOne({ _id: req.params.id });
    res.json({ property: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE property
router.delete('/:id', auth, async (req, res) => {
  try {
    const prop = await db.properties.findOne({ _id: req.params.id, landlordId: req.user._id });
    if (!prop) return res.status(404).json({ error: 'Not found' });
    await db.properties.remove({ _id: req.params.id });
    await db.units.remove({ propertyId: req.params.id }, { multi: true });
    res.json({ message: 'Property deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
