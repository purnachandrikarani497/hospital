const express = require('express');
const router = express.Router();
const Support = require('../models/Support');
const { authenticate } = require('../middlewares/auth');
const User = require('../models/User');

// Public route to submit support request
router.post('/', async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }
    const request = await Support.create({ name, phone });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin only route to get all support requests
router.get('/admin', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const requests = await Support.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin only route to update support request status
router.put('/admin/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { status } = req.body;
    const request = await Support.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
