// routes/notifications.js
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifs = await db.notifications.find({ landlordId: req.user._id }).sort({ createdAt: -1 });
    const unreadCount = notifs.filter(n => !n.read).length;
    res.json({ notifications: notifs.slice(0, 50), unreadCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark all read
router.put('/read-all', auth, async (req, res) => {
  try {
    await db.notifications.update({ landlordId: req.user._id, read: false }, { $set: { read: true } }, { multi: true });
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark one read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await db.notifications.update({ _id: req.params.id, landlordId: req.user._id }, { $set: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
