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

    // 1. Build initial query for DoctorProfile
    const profileCriteria = {};
    if (city) profileCriteria['clinic.city'] = new RegExp(city, 'i');
    if (specialization) profileCriteria['specializations'] = specialization;
    
    if (user && mongoose.Types.ObjectId.isValid(user)) {
      profileCriteria['user'] = new mongoose.Types.ObjectId(String(user));
    } else if (ids) {
      const idArray = String(ids).split(',')
        .filter(id => mongoose.Types.ObjectId.isValid(id.trim()))
        .map(id => new mongoose.Types.ObjectId(id.trim()));
      if (idArray.length) profileCriteria['user'] = { $in: idArray };
    }

    // Always filter by approved doctors only
    const approvedDoctorUsers = await User.find({
      role: 'doctor',
      isDoctorApproved: true
    }).select('_id name');
    const approvedDoctorIds = approvedDoctorUsers.map(u => u._id);

    // If searching by name (q), we need to further narrow down user IDs
    if (q) {
      const qRegex = new RegExp(String(q), 'i');
      const matchingUserIds = approvedDoctorUsers
        .filter(u => qRegex.test(u.name))
        .map(u => u._id);
      
      // Also search by clinic name or specialization in the profile
      profileCriteria.$or = [
        { 'clinic.name': qRegex },
        { 'specializations': { $in: [qRegex] } }
      ];
      if (matchingUserIds.length) {
        profileCriteria.$or.push({ 'user': { $in: matchingUserIds } });
      }
    }

    // Ensure we only get approved doctors
    if (profileCriteria.user) {
        // If user/ids were already specified, intersect with approved IDs
        if (profileCriteria.user.$in) {
            profileCriteria.user.$in = profileCriteria.user.$in.filter(id => 
                approvedDoctorIds.some(aid => String(aid) === String(id))
            );
        } else {
            if (!approvedDoctorIds.some(aid => String(aid) === String(profileCriteria.user))) {
                profileCriteria.user = { $in: [] }; // No match
            }
        }
    } else {
        profileCriteria.user = { $in: approvedDoctorIds };
    }

    // 2. Execute query with populate and fetch ratings in parallel
    const [doctors, stats] = await Promise.all([
      DoctorProfile.find(profileCriteria)
        .select('user specializations experienceYears photoBase64 clinic consultationFees isOnline isBusy')
        .populate({
          path: 'user',
          select: 'name email phone role isDoctorApproved'
        })
        .limit(50)
        .lean(),
      
      Appointment.aggregate([
        { $match: { doctor: { $in: approvedDoctorIds }, ratingStars: { $gte: 1 } } },
        { $group: { _id: '$doctor', avg: { $avg: '$ratingStars' } } }
      ])
    ]);

    // 3. Map ratings to doctors
    const ratingMap = new Map(stats.map(s => [String(s._id), s.avg ? Number(s.avg.toFixed(1)) : 0]));
    
    doctors.forEach(d => {
      d.averageRating = ratingMap.get(String(d.user._id)) || 0;
    });

    console.log(`GET /api/doctors took ${Date.now() - start}ms (optimized parallel)`);
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
