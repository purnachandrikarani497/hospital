const express = require('express');
const router = express.Router();
const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');
const { authenticate } = require('../middlewares/auth');
const Appointment = require('../models/Appointment');


// Public: search doctors
router.get('/', async (req, res) => {
  const start = Date.now();
  try {
    const { q, city, specialization, user, ids } = req.query;
    const mongoose = require('mongoose');

    const filter = {};
    if (city) filter['clinic.city'] = new RegExp(city, 'i');
    if (specialization) filter['specializations'] = specialization;
    
    if (user && /^[0-9a-fA-F]{24}$/.test(String(user))) {
      filter['user'] = new mongoose.Types.ObjectId(String(user));
    } else if (ids) {
      const idArray = String(ids).split(',').filter(id => /^[0-9a-fA-F]{24}$/.test(id.trim())).map(id => new mongoose.Types.ObjectId(id.trim()));
      if (idArray.length) filter['user'] = { $in: idArray };
    }

    // Use a more robust find + populate approach first
    let doctors = await DoctorProfile.find(filter).populate({
      path: 'user',
      select: '-passwordHash',
      match: { role: 'doctor', isDoctorApproved: true }
    }).lean();

    // Filter out doctors whose user accounts aren't approved/found
    doctors = doctors.filter(d => !!d.user);

    if (q) {
      const qRegex = new RegExp(String(q), 'i');
      doctors = doctors.filter(d =>
        qRegex.test(d.user?.name || '') ||
        qRegex.test(d.clinic?.name || '') ||
        (d.specializations || []).some(s => qRegex.test(String(s)))
      );
    }

    // Batch fetch ratings for the found doctors
    if (doctors.length) {
      const doctorIds = doctors.map(d => d.user?._id);
      const stats = await Appointment.aggregate([
        { $match: { doctor: { $in: doctorIds }, ratingStars: { $gte: 1 } } },
        { $group: { _id: '$doctor', avg: { $avg: '$ratingStars' } } }
      ]);
      const ratingMap = new Map(stats.map(s => [String(s._id), s.avg ? Number(s.avg.toFixed(1)) : 0]));
      
      doctors.forEach(d => {
        d.averageRating = ratingMap.get(String(d.user?._id)) || 0;
      });
    }

    console.log(`GET /api/doctors took ${Date.now() - start}ms (optimized find)`);
    res.json(doctors);
  } catch (err) {
    console.error('Error in doctor search:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


// Protected: submit or update profile (doctor user)
router.post('/me', authenticate, async (req, res) => {
const user = req.user;
if (user.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
const payload = req.body;
if (payload.specializations && Array.isArray(payload.specializations)) {
  payload.specializations = [...new Set(payload.specializations)];
}
let profile = await DoctorProfile.findOne({ user: user._id });
if (!profile) profile = new DoctorProfile({ user: user._id, ...payload });
else Object.assign(profile, payload);
await profile.save();
profile = await DoctorProfile.findById(profile._id).populate('user', '-passwordHash');
res.json(profile);
});

// Protected: update online/busy status (doctor user)
router.put('/me/status', authenticate, async (req, res) => {
  const user = req.user;
  if (user.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
  const { isOnline, isBusy } = req.body || {};
  let profile = await DoctorProfile.findOne({ user: user._id });
  if (!profile) profile = new DoctorProfile({ user: user._id });
  if (typeof isOnline === 'boolean') profile.isOnline = isOnline;
  if (typeof isBusy === 'boolean') profile.isBusy = isBusy;
  await profile.save();
  try {
    const io = req.app.get('io');
    if (io) io.emit('doctor:status', { doctorId: String(user._id), isOnline: !!profile.isOnline, isBusy: !!profile.isBusy });
  } catch (e) {}
  res.json({ isOnline: profile.isOnline, isBusy: profile.isBusy });
});

// Public: get doctor rating summary
router.get('/:id/rating', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'id required' });
  const docsFilter = { doctor: id, ratingStars: { $gte: 1 } };
  try {
    const stats = await Appointment.aggregate([
      { $match: { doctor: require('mongoose').Types.ObjectId(id), ratingStars: { $gte: 1 } } },
      { $group: { _id: '$doctor', count: { $sum: 1 }, avg: { $avg: '$ratingStars' } } }
    ]);
    const count = stats[0]?.count || 0;
    const avg = stats[0]?.avg ? Number(stats[0].avg.toFixed(1)) : 0;
    res.json({ average: avg, count });
  } catch (_) {
    // Fallback without aggregate ObjectId conversion
    const list = await Appointment.find(docsFilter).select('ratingStars');
    const count = list.length;
    const sum = list.reduce((p, c) => p + (Number(c.ratingStars || 0) || 0), 0);
    const avg = count ? Number((sum / count).toFixed(1)) : 0;
    res.json({ average: avg, count });
  }
});


module.exports = router;
