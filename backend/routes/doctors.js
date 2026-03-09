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
    const { q, city, specialization, user } = req.query;
    const mongoose = require('mongoose');

    // 1. Filter approved doctors only
    const userMatch = { role: 'doctor', isDoctorApproved: true };
    if (q) {
      userMatch.$or = [
        { name: new RegExp(String(q), 'i') }
      ];
    }

    const pipeline = [
      // Join with User
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      // Filter by approved doctor
      {
        $match: {
          'userData.role': 'doctor',
          'userData.isDoctorApproved': true
        }
      }
    ];

    // 2. Apply additional filters
    const profileMatch = {};
    if (city) profileMatch['clinic.city'] = new RegExp(city, 'i');
    if (specialization) profileMatch['specializations'] = specialization;
    if (user && /^[0-9a-fA-F]{24}$/.test(String(user))) profileMatch['user'] = new mongoose.Types.ObjectId(String(user));
    
    if (q) {
      const qRegex = new RegExp(String(q), 'i');
      profileMatch.$or = [
        { 'userData.name': qRegex },
        { 'clinic.name': qRegex },
        { 'specializations': qRegex }
      ];
    }

    if (Object.keys(profileMatch).length > 0) {
      pipeline.push({ $match: profileMatch });
    }

    // 3. Add rating aggregation (lookup from appointments)
    pipeline.push({
      $lookup: {
        from: 'appointments',
        let: { userId: '$user' },
        pipeline: [
          { 
            $match: { 
              $expr: { $eq: ['$doctor', '$$userId'] },
              ratingStars: { $gte: 1 }
            } 
          },
          { $group: { _id: null, avg: { $avg: '$ratingStars' } } }
        ],
        as: 'ratingInfo'
      }
    });

    pipeline.push({
      $addFields: {
        averageRating: { 
          $ifNull: [{ $round: [{ $arrayElemAt: ['$ratingInfo.avg', 0] }, 1] }, 0] 
        },
        // Reformat user for backward compatibility
        user: '$userData'
      }
    });

    pipeline.push({ $project: { userData: 0, ratingInfo: 0, 'user.passwordHash': 0 } });

    const doctors = await DoctorProfile.aggregate(pipeline);
    console.log(`GET /api/doctors took ${Date.now() - start}ms (aggregation)`);
    res.json(doctors);
  } catch (err) {
    console.error('Error in optimized doctor search:', err);
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
