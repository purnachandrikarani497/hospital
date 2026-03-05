const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const Appointment = require("../models/Appointment");
const DoctorProfile = require("../models/DoctorProfile");
const { generateSlots } = require("../utils/slotGenerator");
const { sendMail } = require("../utils/mailer");
const { createMeetLink } = require("../utils/meeting");
const { notifyAppointmentConfirmed, notifyMeetingLink, notifySessionComplete, notifyPrescription, notifyAppointmentCancelled } = require('../utils/notify');
const cloudinary = require('cloudinary').v2;
const Razorpay = require('razorpay');
const crypto = require('crypto');

// -------------------------------
// Get available slots for a doctor
// -------------------------------
router.get("/slots/:doctorId", async (req, res) => {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date)
        return res.status(400).json({ message: "Date is required" });

    const profile = await DoctorProfile.findOne({ user: doctorId });
    if (!profile)
        return res.status(404).json({ message: "Doctor profile not found" });

    const day = new Date(date).getDay(); // 0-6 (Sun-Sat)
    let todaysAvailability = [{ day, from: "00:00", to: "24:00" }];

    const duration = profile.slotDurationMins || 15;
    const slotsMap = generateSlots(todaysAvailability, duration);
    const allSlots = slotsMap[day] || [];

    // Remove already booked slots
    const booked = await Appointment.find({
        doctor: doctorId,
        date: date,
        status: { $in: ["PENDING", "CONFIRMED"] }
    });

    const availableSlots = allSlots.filter(slot =>
        !booked.some(b => b.startTime === slot.start)
    );

    res.json(availableSlots);
});

// -----------------------------------
// Book Appointment
// -----------------------------------
router.post("/", authenticate, async (req, res) => {
    const { doctorId, date, startTime, endTime, type, beneficiaryType, beneficiaryName } = req.body;

    if (!doctorId || !date || !startTime || !endTime)
        return res.status(400).json({ message: "Missing fields" });

    // Check conflicts (Doctor's side)
    const conflict = await Appointment.findOne({
        doctor: doctorId,
        date,
        startTime,
        status: { $in: ["PENDING", "CONFIRMED"] }
    });

    if (conflict)
        return res.status(409).json({ message: "Slot already booked" });

    // Check conflicts (Patient's side)
    const patientConflict = await Appointment.findOne({
        patient: req.user._id,
        date,
        startTime,
        status: { $in: ["PENDING", "CONFIRMED"] }
    });

    if (patientConflict)
        return res.status(409).json({ message: "You already have an appointment with a doctor at this time. If you want to book this appointment, please cancel your existing appointment first." });

    const profile = await DoctorProfile.findOne({ user: doctorId });
    const fee = profile?.consultationFees || 0;

    let appointment = await Appointment.create({
        patient: req.user._id,
        doctor: doctorId,
        date,
        startTime,
        endTime,
        type,
        status: "PENDING",
        paymentStatus: "PENDING",
        fee,
        beneficiaryType: beneficiaryType || "self",
        beneficiaryName: beneficiaryName || undefined
    });

    // Do not auto-generate Google Meet link; doctor will set a real link

    res.json(appointment);
});

// Set or update meeting link and notify patient (doctor only)
router.put('/:id/meet-link', authenticate, async (req, res) => {
  const { id } = req.params;
  const { url } = req.body || {};
  if (!id || !url || typeof url !== 'string') return res.status(400).json({ message: 'id and url required' });
  const link = String(url).replace(/[`'\"]/g, '').trim();
  if (!/^https?:\/\//.test(link)) return res.status(400).json({ message: 'Invalid meeting link' });
  const appt = await Appointment.findById(id).populate('patient', 'email name');
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (req.user.role !== 'doctor' || String(appt.doctor) !== String(req.user._id)) return res.status(403).json({ message: 'Only the doctor can set link' });
  appt.meetingLink = link;
  await appt.save();
  try {
    const email = appt.patient?.email;
    if (email) await sendMail(email, 'Join Meeting', `Doctor has started your consultation. Join here: ${link}`);
  } catch (e) {}
  try { await notifyMeetingLink(req.app, appt); } catch (_) {}
  res.json({ ok: true });
});

router.post('/:id/meet-link/generate', authenticate, async (req, res) => {
  const { id } = req.params;
  const appt = await Appointment.findById(id).populate('patient', 'email name');
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (req.user.role !== 'doctor' || String(appt.doctor) !== String(req.user._id)) return res.status(403).json({ message: 'Only the doctor can generate link' });
  try {
    const url = await createMeetLink({ doctorId: appt.doctor, date: appt.date, startTime: appt.startTime, endTime: appt.endTime });
    if (!url || !/^https?:\/\//.test(url)) return res.status(500).json({ message: 'Failed to generate meeting link' });
    appt.meetingLink = url;
    await appt.save();
    try { if (appt.patient?.email) await sendMail(appt.patient.email, 'Join Meeting', `Doctor has started your consultation. Join here: ${url}`); } catch (_) {}
    try { await notifyMeetingLink(req.app, appt); } catch (_) {}
    return res.json({ url });
  } catch (e) {
    return res.status(500).json({ message: e.message || 'Failed to generate meeting link' });
  }
});

router.post("/:id/order", authenticate, async (req, res) => {
    const { id } = req.params;
    const { includeServiceFee } = req.body;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.patient) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });

    const rzpId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const rzpSecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!rzpId || !rzpSecret) {
      return res.status(500).json({ message: "Razorpay keys not configured on server" });
    }

    const instance = new Razorpay({
        key_id: rzpId,
        key_secret: rzpSecret,
    });

    const fee = Number(appt.fee || 0);
    const serviceFee = includeServiceFee ? 20 : 0;
    const totalAmount = fee + serviceFee;

    const options = {
        amount: Math.round(totalAmount * 100),  // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_#${appt._id}`
    };

    try {
        const order = await instance.orders.create(options);
        res.json({ ...order, key: rzpId });
    } catch (error) {
        console.error("Razorpay order creation error:", error);
        res.status(500).json({ message: error.message });
    }
});

router.post("/:id/pay", authenticate, async (req, res) => {
    const { id } = req.params;
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.patient) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    if (appt.paymentStatus === "PAID") return res.json(appt);

    const rzpSecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    try {
        const text = razorpayOrderId + '|' + razorpayPaymentId;
        const hmac = crypto.createHmac('sha256', rzpSecret);
        hmac.update(text);
        const digest = hmac.digest('hex');

        if (digest !== razorpaySignature) {
            appt.paymentStatus = 'FAILED';
            await appt.save();
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // --- Payment is verified, proceed with booking confirmation ---

        appt.paymentStatus = "PAID";
        appt.status = "CONFIRMED";
        if (appt.type === 'online' && !appt.meetingLink) {
          try {
            const link = await createMeetLink({ doctorId: appt.doctor, date: appt.date, startTime: appt.startTime, endTime: appt.endTime });
            if (link) appt.meetingLink = link;
          } catch (_) {}
        }
        await appt.save();

      const populated = await Appointment.findById(id)
          .populate("doctor", "name email")
          .populate("patient", "name email");

        const when = `${populated.date} ${populated.startTime}-${populated.endTime}`;
        const subject = "Appointment Confirmed";
        const joinLine = populated.meetingLink ? `\nJoin: ${populated.meetingLink}` : "";
        const textPatient = `Your appointment with ${populated.doctor.name} is confirmed for ${when}.${joinLine}`;
        const textDoctor = `New appointment confirmed with ${populated.patient.name} for ${when}.${joinLine}`;
        try {
            if (populated.patient.email) await sendMail(populated.patient.email, subject, textPatient);
            if (populated.doctor.email) await sendMail(populated.doctor.email, subject, textDoctor);
        } catch (e) {}

      try {
        const io = req.app.get('io');
        if (io) io.emit('appointment:new', populated);
      } catch (_) {}
      try { await notifyAppointmentConfirmed(req.app, populated); } catch (_) {}

        res.json(populated);
    } catch (error) {
        console.error("Payment processing error:", error);
        res.status(500).json({ message: error.message || "Payment processing error" });
    }
});

router.get("/today", authenticate, async (req, res) => {
    if (req.user.role !== "doctor") return res.status(403).json({ message: "Only doctors" });
    const today = new Date().toISOString().slice(0, 10);
    const list = await Appointment.find({ 
        doctor: req.user._id, 
        date: today,
        status: { $ne: "CANCELLED" }
    })
        .populate("patient", "name email photoBase64 birthday gender")
        .sort({ startTime: -1 });
    res.json(list);
});

router.put("/:id/complete", authenticate, async (req, res) => {
    if (req.user.role !== "doctor") return res.status(403).json({ message: "Only doctors" });
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    if (String(appt.doctor) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  appt.status = "COMPLETED";
  await appt.save();
  try { await notifySessionComplete(req.app, appt); } catch (_) {}
  res.json(appt);
});

router.put('/:id/payment/failed', authenticate, async (req, res) => {
  const { id } = req.params;
  const appt = await Appointment.findById(id).populate('patient','name email');
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (String(appt.patient._id || appt.patient) !== String(req.user._id)) return res.status(403).json({ message: 'Forbidden' });
  appt.paymentStatus = 'FAILED';
  appt.status = 'PENDING';
  await appt.save();
  try {
    const email = appt.patient?.email;
    if (email) await sendMail(email, 'Payment Failed', 'Payment unsuccessful. Appointment not booked.');
  } catch (_) {}
  try {
    const { createNotification } = require('../utils/notify');
    await createNotification(req.app, { userId: appt.patient._id || appt.patient, title: 'Payment Failed', message: 'Payment unsuccessful. Appointment not booked.', type: 'payment', link: '/appointments', dedupeKey: `payfail_${String(appt._id || appt.id || '')}` });
  } catch (_) {}
  res.json({ ok: true });
});

router.put("/:id/complete", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const appt = await Appointment.findById(id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    
    const uid = String(req.user._id);
    const isDoctor = String(appt.doctor) === uid;
    const isPatient = String(appt.patient) === uid;
    const isAdmin = req.user.role === "admin";

    if (!isDoctor && !isPatient && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    appt.status = "COMPLETED";
    await appt.save();

    // Reset doctor status to online and not busy
    try {
      const DoctorProfile = require('../models/DoctorProfile');
      await DoctorProfile.findOneAndUpdate(
        { user: appt.doctor },
        { isOnline: true, isBusy: false }
      );
    } catch (_) {}

    res.json(appt);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put("/:id/cancel", authenticate, async (req, res) => {
    const { id } = req.params;
    const appt = await Appointment.findById(id).populate('patient', 'name').populate('doctor', 'name');
    if (!appt) return res.status(404).json({ message: "Appointment not found" });
    const uid = String(req.user._id);
    const patientId = String(appt.patient?._id || appt.patient);
    const doctorId = String(appt.doctor?._id || appt.doctor);
    const isOwner = patientId === uid || doctorId === uid;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });
    appt.status = "CANCELLED";
    await appt.save();

    // Notify the other party
    const cancelledBy = patientId === uid ? 'patient' : (isAdmin ? 'admin' : 'doctor');
    try {
      await notifyAppointmentCancelled(req.app, appt, cancelledBy);
    } catch (_) {}

    res.json(appt);
});

router.put("/:id/accept", authenticate, async (req, res) => {
  const { id } = req.params;
  const { date, startTime } = req.body || {};
  let appt = await Appointment.findById(id);
  if (!appt && date && startTime) {
    appt = await Appointment.findOne({ doctor: req.user._id, date, startTime });
  }
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (req.user.role !== "doctor" || String(appt.doctor) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the doctor can accept" });
  }
  appt.status = "CONFIRMED";
  await appt.save();
  res.json(appt);
});

router.put("/:id/reject", authenticate, async (req, res) => {
  const { id } = req.params;
  const { date, startTime } = req.body || {};
  let appt = await Appointment.findById(id).populate('patient', 'name').populate('doctor', 'name');
  if (!appt && date && startTime) {
    appt = await Appointment.findOne({ doctor: req.user._id, date, startTime }).populate('patient', 'name').populate('doctor', 'name');
  }
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  const uid = String(req.user._id);
  const isDoctor = req.user.role === "doctor" && String(appt.doctor?._id || appt.doctor) === uid;
  const isAdmin = req.user.role === "admin";
  if (!isDoctor && !isAdmin) return res.status(403).json({ message: "Forbidden" });
  appt.status = "CANCELLED";
  await appt.save();

  // Rejection is always by doctor/admin, notify patient
  try {
    await notifyAppointmentCancelled(req.app, appt, isAdmin ? 'admin' : 'doctor');
  } catch (_) {}

  res.json(appt);
});

router.post("/:id/prescription", authenticate, async (req, res) => {
  const { id } = req.params;
  const { text, notify, isPrescriptionShared } = req.body;
  const appt = await Appointment.findById(id).populate("patient", "name email");
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (req.user.role !== "doctor" || String(appt.doctor) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  
  appt.prescriptionText = text || "";
  if (isPrescriptionShared !== undefined) {
    appt.isPrescriptionShared = !!isPrescriptionShared;
  }
  await appt.save();

  if (notify !== false) {
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/prescription/${id}`;
    try {
      if (appt.patient.email) await sendMail(appt.patient.email, "Prescription Available", `Your prescription is ready: ${url}`);
    } catch (e) {}
    try { await notifyPrescription(req.app, id); } catch (_) {}
  }
  res.json({ ok: true });
});

// Patient rates the appointment/doctor
router.put('/:id/rate', authenticate, async (req, res) => {
  const { id } = req.params;
  const { stars, text } = req.body || {};
  const appt = await Appointment.findById(id);
  if (!appt) return res.status(404).json({ message: 'Appointment not found' });
  if (String(appt.patient) !== String(req.user._id)) return res.status(403).json({ message: 'Only the patient can rate' });
  if (typeof stars !== 'number' || stars < 1 || stars > 5) return res.status(400).json({ message: 'stars must be 1-5' });
  appt.ratingStars = Math.round(stars);
  appt.ratingText = typeof text === 'string' ? text : appt.ratingText;
  appt.ratedAt = new Date();
  await appt.save();
  res.json({ ok: true });
});

// Patient adds or updates details for online consultation
router.put("/:id/patient-details", authenticate, async (req, res) => {
  const { id } = req.params;
  const { symptoms, summary, date, startTime, doctorId, reports } = req.body || {};
  let appt = null;
  try {
    if (id && id !== 'undefined') {
      appt = await Appointment.findById(id);
    }
  } catch (_) { appt = null; }
  if (!appt) {
    const filter = { patient: req.user._id };
    if (doctorId) filter.doctor = doctorId;
    if (date) filter.date = String(date);
    if (startTime) filter.startTime = String(startTime);
    appt = await Appointment.findOne(filter);
  }
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  appt.patientSymptoms = typeof symptoms === 'string' ? symptoms : appt.patientSymptoms;
  appt.patientSummary = typeof summary === 'string' ? summary : appt.patientSummary;
  try {
    if (Array.isArray(reports)) {
      const clean = [];
      const seen = new Set();
      for (const r of reports) {
        const name = typeof r?.name === 'string' ? r.name : '';
        let url = typeof r?.url === 'string' ? r.url : '';
        if (!name || !url) continue;
        if (url.startsWith('data:image')) {
          if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
            const result = await cloudinary.uploader.upload(url, {
              folder: 'hms_medical_reports',
              resource_type: 'image'
            });
            url = result.secure_url;
          } else {
            // Fallback to storing base64 directly if Cloudinary is not configured
            // url remains the base64 string
          }
        }
        const key = `${name}|${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        clean.push({ name, url });
      }
      appt.patientReports = clean.slice(0, 20);
    }
  } catch (_) {}
  await appt.save();
  res.json({ ok: true });
});

// Fallback without id
router.put("/patient-details", authenticate, async (req, res) => {
  const { symptoms, summary, date, startTime, doctorId, reports } = req.body || {};
  const filter = { patient: req.user._id };
  if (doctorId) filter.doctor = doctorId;
  if (date) filter.date = String(date);
  if (startTime) filter.startTime = String(startTime);
  const update = {};
  if (typeof symptoms === 'string') update.patientSymptoms = symptoms;
  if (typeof summary === 'string') update.patientSummary = summary;

  try {
    if (Array.isArray(reports)) {
      const clean = [];
      const seen = new Set();
      for (const r of reports) {
        const name = typeof r?.name === 'string' ? r.name : '';
        let url = typeof r?.url === 'string' ? r.url : '';
        if (!name || !url) continue;
        if (url.startsWith('data:image')) {
          if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_CLOUD_NAME) {
            const result = await cloudinary.uploader.upload(url, {
              folder: 'hms_medical_reports',
              resource_type: 'image'
            });
            url = result.secure_url;
          } else {
            // Fallback to storing base64 directly if Cloudinary is not configured
            // url remains the base64 string
          }
        }
        const key = `${name}|${url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        clean.push({ name, url });
      }
      update.patientReports = clean.slice(0, 20);
    }
  } catch (_) {}

  const appt = await Appointment.findOneAndUpdate(filter, { $set: update }, { new: true });
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  res.json({ ok: true });
});

// -----------------------------------
// View my appointments (patient or doctor)
// -----------------------------------
router.get("/mine", authenticate, async (req, res) => {
  const filter = req.user.role === "doctor"
    ? { doctor: req.user._id }
    : { patient: req.user._id };

  const list = await Appointment.find(filter)
    .populate("doctor", "name")
    .populate("patient", "name photoBase64 birthday gender");

  res.json(list);
});

router.get("/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const appt = await Appointment.findById(id)
    .populate("doctor", "name email phone")
    .populate("patient", "name email gender birthday photoBase64");
  if (!appt) return res.status(404).json({ message: "Appointment not found" });
  if (String(appt.patient._id) !== String(req.user._id) && String(appt.doctor._id) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
  
  // Hide prescription from patient if not shared
  if (req.user.role === 'patient' && !appt.isPrescriptionShared) {
    appt.prescriptionText = "";
  }

  res.json(appt);
});


module.exports = router;
