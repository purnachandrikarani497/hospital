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

    // 1. Prepare filtering criteria
    const matchCriteria = {
      'user_info.role': 'doctor',
      'user_info.isDoctorApproved': true
    };

    if (city) matchCriteria['clinic.city'] = new RegExp(city, 'i');
    if (specialization) matchCriteria['specializations'] = specialization;
    
    if (user && mongoose.Types.ObjectId.isValid(user)) {
      matchCriteria['user'] = new mongoose.Types.ObjectId(String(user));
    } else if (ids) {
      const idArray = String(ids).split(',')
        .filter(id => mongoose.Types.ObjectId.isValid(id.trim()))
        .map(id => new mongoose.Types.ObjectId(id.trim()));
      if (idArray.length) matchCriteria['user'] = { $in: idArray };
    }

    if (q) {
      const qRegex = new RegExp(String(q), 'i');
      matchCriteria.$or = [
        { 'user_info.name': qRegex },
        { 'clinic.name': qRegex },
        { 'specializations': { $in: [qRegex] } }
      ];
    }

    // 2. Execute efficient aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'users', // The name of the User collection
          localField: 'user',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      { $unwind: '$user_info' },
      { $match: matchCriteria },
      {
        $project: {
          'user_info.passwordHash': 0, // Exclude password hash
          'user_info.resetOtp': 0,
          'user_info.resetOtpExpires': 0
        }
      }
    ];

    let doctors = await DoctorProfile.aggregate(pipeline);

    // 3. Normalize the output format (mapping user_info back to user)
    doctors = doctors.map(d => {
      const normalized = { ...d, user: d.user_info };
      delete normalized.user_info;
      return normalized;
    });

    // 4. Batch fetch ratings for the found doctors
    if (doctors.length) {
      const doctorIds = doctors.map(d => d.user._id);
      const stats = await Appointment.aggregate([
        { $match: { doctor: { $in: doctorIds }, ratingStars: { $gte: 1 } } },
        { $group: { _id: '$doctor', avg: { $avg: '$ratingStars' } } }
      ]);
      const ratingMap = new Map(stats.map(s => [String(s._id), s.avg ? Number(s.avg.toFixed(1)) : 0]));
      
      doctors.forEach(d => {
        d.averageRating = ratingMap.get(String(d.user._id)) || 0;
      });
    }

    console.log(`GET /api/doctors took ${Date.now() - start}ms (optimized aggregation)`);
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
