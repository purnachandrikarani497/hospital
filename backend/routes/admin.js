const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { sendMail } = require('../utils/mailer');
const Appointment = require('../models/Appointment');
const { createNotification } = require('../utils/notify');

// Create doctor (admin)
router.post('/doctors', authenticate, authorize(['admin']), async (req, res) => {
  const {
    name,
    email,
    phone,
    specializations,
    clinic,
    city,
    fees,
    slotDurationMins,
    experienceYears,
    about,
    photoBase64,
    password
  } = req.body;

  if (!name || !email) return res.status(400).json({ message: 'Name and email required' });
  if (!password || String(password).trim().length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

  const emailLower = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: emailLower });
  if (existing) return res.status(400).json({ message: 'Email already exists' });

  const bcrypt = require('bcrypt');
  const passwordHash = await bcrypt.hash(String(password).trim(), 10);

  const user = await User.create({
    name,
    email: emailLower,
    phone,
    passwordHash,
    role: 'doctor',
    isDoctorApproved: true
  });

  const rawSpecs = Array.isArray(specializations)
    ? specializations
    : String(specializations || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
  const specs = [...new Set(rawSpecs)];

  const profile = await DoctorProfile.create({
    user: user._id,
    specializations: specs,
    clinic: { name: clinic || '', address: (req.body.address || ''), city: city || '' },
    consultationFees: fees ? Number(fees) : undefined,
    slotDurationMins: slotDurationMins ? Number(slotDurationMins) : undefined,
    experienceYears: experienceYears ? Number(experienceYears) : undefined,
    about: about || undefined,
    photoBase64: photoBase64 || undefined,
    isOnline: false
  });

  try {
    if (user.email) {
      const loginUrl = `${process.env.FRONTEND_URL || ''}/doctor/login`;
      const body = `Your doctor account has been created.\nEmail: ${user.email}\nPassword: ${String(password).trim()}\nLogin: ${loginUrl}`;
      await sendMail(user.email, 'Your Doctor Account Credentials', body);
    }
  } catch (e) { console.error('Email send error', e); }

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    profile
  });
});

// Reset doctor password (admin)
router.post('/doctors/reset-password', authenticate, authorize(['admin']), async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || String(newPassword).trim().length < 6) {
    return res.status(400).json({ message: 'Email and newPassword (min 6 chars) required' });
  }
  const bcrypt = require('bcrypt');
  const emailLower = String(email).trim().toLowerCase();
  const emailRegex = new RegExp('^' + emailLower.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '$', 'i');
  const user = await User.findOne({ email: emailRegex });
  if (!user || user.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
  user.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
  await user.save();
  res.json({ ok: true });
});

router.get('/pending-doctors', authenticate, authorize(['admin']), async (req, res) => {
  const users = await User.find({ role: 'doctor', isDoctorApproved: false }).select('-passwordHash');
  const ids = users.map(u => u._id);
  const profiles = await DoctorProfile.find({ user: { $in: ids } });
  const map = new Map(profiles.map(p => [String(p.user), p]));
  const out = users.map(u => ({ user: u, profile: map.get(String(u._id)) || null }));
  res.json(out);
});

router.post('/doctors/:id/approve', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
  user.isDoctorApproved = true;
  await user.save();
  res.json({ ok: true });
});

router.post('/doctors/:id/reject', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = await User.findById(id);
  if (!user || user.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });
  user.isDoctorApproved = false;
  await user.save();
  try {
    if (user.email) await sendMail(user.email, 'Doctor Profile Rejected', reason || 'Your doctor profile was rejected.');
  } catch (e) {}
  res.json({ ok: true });
});

// List all appointments (admin)
router.get('/appointments', authenticate, authorize(['admin']), async (req, res) => {
  const start = Date.now();
  try {
    const list = await Appointment.find({})
      .select('-patientReports -preChat')
      .populate({ path: 'doctor', select: 'name' })
      .populate({ path: 'patient', select: 'name birthday gender' })
      .sort({ date: -1, startTime: -1 });
    console.log(`GET /api/admin/appointments took ${Date.now() - start}ms`);
    res.json(list);
  } catch (err) {
    console.error('Error fetching admin appointments:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// List all patients (admin)
router.get('/patients', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const patients = await User.find({ role: 'patient' }).select('-passwordHash');
    res.json(patients);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete doctor (admin)
router.delete('/doctors/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user || user.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });

    // Get tomorrow's date string
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find appointments for tomorrow and onwards
    const appts = await Appointment.find({
      doctor: id,
      date: { $gte: tomorrowStr },
      status: { $ne: 'CANCELLED' }
    }).populate('doctor', 'name');

    for (const appt of appts) {
      appt.status = 'CANCELLED';
      await appt.save();

      const doctorName = appt.doctor?.name || user.name || 'Doctor';
      const message = `Your appointment with Dr. ${doctorName} on ${appt.date} has been cancelled as the doctor is no longer available on our platform. We apologize for the inconvenience.`;
      
      await createNotification(req.app, {
        userId: appt.patient,
        title: 'Appointment Cancelled',
        message,
        type: 'appointment',
        link: '/appointments'
      });
    }

    // Delete profile and user
    await DoctorProfile.deleteOne({ user: id });
    await User.deleteOne({ _id: id });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Edit doctor (admin)
router.put('/doctors/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      specializations,
      clinic,
      city,
      address,
      fees,
      slotDurationMins,
      experienceYears,
      about,
      photoBase64,
      password
    } = req.body;

    const user = await User.findById(id);
    if (!user || user.role !== 'doctor') return res.status(404).json({ message: 'Doctor not found' });

    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password && String(password).trim().length >= 6) {
      const bcrypt = require('bcrypt');
      user.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }
    await user.save();

    const profile = await DoctorProfile.findOne({ user: id });
    if (profile) {
      if (specializations) {
        const rawSpecs = Array.isArray(specializations)
          ? specializations
          : String(specializations || '')
              .split(',')
              .map(s => s.trim())
              .filter(Boolean);
        profile.specializations = [...new Set(rawSpecs)];
      }
      if (clinic || city || address) {
        profile.clinic = {
          name: clinic || profile.clinic.name || '',
          address: address || profile.clinic.address || '',
          city: city || profile.clinic.city || ''
        };
      }
      if (fees !== undefined) profile.consultationFees = Number(fees);
      if (slotDurationMins !== undefined) profile.slotDurationMins = Number(slotDurationMins);
      if (experienceYears !== undefined) profile.experienceYears = Number(experienceYears);
      if (about !== undefined) profile.about = about;
      if (photoBase64 !== undefined) profile.photoBase64 = photoBase64;
      await profile.save();
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
