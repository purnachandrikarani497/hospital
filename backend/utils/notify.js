const Notification = require('../models/Notification');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

async function createNotification(app, payload) {
  const { userId, title, message, type, link, dedupeKey, apptId, text, kind } = payload || {};
  if (!userId || !message) return null;
  let existing = null;
  if (dedupeKey && type !== 'chat') existing = await Notification.findOne({ user: userId, dedupeKey });
  if (existing) return existing;
  const doc = await Notification.create({ user: userId, title, message, type, kind, link, dedupeKey, apptId: apptId ? String(apptId) : undefined });
  try {
    const io = app.get('io');
    if (io) io.to(`user:${String(userId)}`).emit('notify', { id: String(doc._id), title, message, type, kind, link, apptId: apptId ? String(apptId) : undefined, text });
  } catch (_) {}
  return doc;
}

async function notifyChat(app, msg) {
  try {
    const { apptId, actor, text, kind } = msg || {};
    const a = await Appointment.findById(apptId).select('patient doctor').populate('patient','name').populate('doctor','name');
    if (!a) return;
    const toDoctor = String(actor || '').toLowerCase() === 'patient';
    const userId = toDoctor ? a.doctor : a.patient;
    const name = toDoctor ? (a.patient?.name || 'Patient') : (a.doctor?.name || 'Doctor');
    const title = 'New Message';
    const snippet = (String(text || '').trim() || '').slice(0, 80);
    const message = snippet ? `New message from ${name}: ${snippet}` : `New message from ${name}`;
    const type = 'chat';
    let link = toDoctor ? '/doctor/dashboard' : '/appointments?alertChat=1';
    try {
      const id = String(apptId || '');
      if (!toDoctor && id) {
        if (String(kind || '').toLowerCase() === 'followup') link = `/appointments/${id}/followup`;
        else if (String(kind || '').toLowerCase() === 'pre') link = `/appointments/${id}/details`;
      }
      if (toDoctor && id) {
        if (String(kind || '').toLowerCase() === 'followup') link = `/doctor/appointments/${id}/followup`;
      }
    } catch (_) {}
    await createNotification(app, { userId, title, message, type, kind, link, apptId, text });
  } catch (_) {}
}

async function notifyAppointmentConfirmed(app, appt) {
  try {
    const id = String(appt._id || appt.id || '');
    const when = `${appt.date} ${appt.startTime}-${appt.endTime}`;
    const patientName = appt.patient?.name || '';
    const doctorName = appt.doctor?.name || '';
    await createNotification(app, { userId: appt.doctor, title: 'New Appointment', message: `New Appointment — Patient: ${patientName}, Time: ${when}.`, type: 'appointment', link: '/doctor/dashboard', dedupeKey: `appt_confirm_doctor_${id}` });
    await createNotification(app, { userId: appt.patient, title: 'Appointment Confirmed', message: `Your consultation with Dr. ${doctorName} is confirmed.`, type: 'appointment', link: '/appointments', dedupeKey: `appt_confirm_patient_${id}` });
  } catch (_) {}
}

async function notifyMeetingLink(app, appt) {
  try {
    const id = String(appt._id || appt.id || '');
    const link = '/appointments';
    await createNotification(app, { userId: appt.patient, title: 'Join Meet', message: 'Join Meet is now available — click to start consultation.', type: 'meet', link, dedupeKey: `meet_link_${id}` });
  } catch (_) {}
}

async function notifySessionComplete(app, appt) {
  try {
    const id = String(appt._id || appt.id || '');
    await createNotification(app, { userId: appt.patient, title: 'Session Completed', message: 'Doctor ended the consultation. Session Closed.', type: 'session', link: '/appointments', dedupeKey: `session_complete_${id}` });
  } catch (_) {}
}

async function notifyPrescription(app, apptId) {
  try {
    const a = await Appointment.findById(apptId).populate('patient','name').populate('doctor','name');
    if (!a) return;
    const id = String(a._id || a.id || '');
    const link = `/prescription/${id}`;
    await createNotification(app, { userId: a.patient, title: 'Prescription Ready', message: 'Prescription ready — click to view/download.', type: 'prescription', link, dedupeKey: `pres_${id}` });
  } catch (_) {}
}

module.exports = { createNotification, notifyChat, notifyAppointmentConfirmed, notifyMeetingLink, notifySessionComplete, notifyPrescription };
