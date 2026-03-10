require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});


const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const specializationRoutes = require('./routes/specializations');
const notificationRoutes = require('./routes/notifications');
const supportRoutes = require('./routes/support');
const jwt = require('jsonwebtoken');
const { notifyChat } = require('./utils/notify');


const app = express();
const allowedOrigins = [process.env.CORS_ORIGIN_LOCAL, process.env.CORS_ORIGIN_PRODUCTION, 'http://localhost:3000'].filter(Boolean);
const corsConfig = { origin: allowedOrigins.length ? allowedOrigins : '*', credentials: true };
app.use(cors(corsConfig));
app.options('*', cors(corsConfig));
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: false, // Sometimes CSP can block the request as well
}));
app.use(compression());
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=*, camera=*, geolocation=*, gyroscope=*, magnetometer=*, microphone=*, payment=*, usb=*');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

connectDB().then(async () => {
  // Seed specializations if empty
  const Specialization = require('./models/Specialization');
  const count = await Specialization.countDocuments();
  if (count === 0) {
    const defaultSpecs = [
      "General Physician", "Gynecologist", "Dermatologist", "Pediatrician",
      "Neurologist", "Cardiologist", "Orthopedic Surgeon", "Gastroenterologist",
      "ENT Specialist", "Dentist", "Psychiatrist", "Diabetologist",
      "Endocrinologist", "Pulmonologist", "Nephrologist", "Urologist",
      "Ophthalmologist", "Oncologist", "Rheumatologist", "Physiotherapist"
    ];
    await Specialization.insertMany(defaultSpecs.map(name => ({ name })));
    console.log('Specializations seeded');
  }
});

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsConfig.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

io.on('connection', (socket) => {
  try {
    const token = socket.handshake?.auth?.token || '';
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) socket.join(`user:${String(decoded.id)}`);
    }
  } catch (_) {}
const Appointment = require('./models/Appointment');

  socket.on('disconnect', () => {});
  socket.on('chat:new', async (msg) => {
    try {
      socket.broadcast.emit('chat:new', msg);
    } catch (_) {}
    try {
      await notifyChat(app, msg);
    } catch (_) {}
    try {
      const { apptId, actor, kind, text } = msg || {};
      if (kind === 'pre' && text) {
        await Appointment.findOneAndUpdate(
          { _id: apptId },
          { $push: { preChat: { actor, text, createdAt: new Date() } } },
          { new: true }
        );
      }
    } catch (_) {}
  });
  socket.on('meet:update', async (msg) => {
    try {
      socket.broadcast.emit('meet:update', msg);
    } catch (_) {}
    try {
      const { apptId, actor, event } = msg || {};
      const Appointment = require('./models/Appointment');
      const a = await Appointment.findById(apptId).populate('patient','name').populate('doctor','name');
      if (!a) return;
      const id = String(a._id || a.id || '');
      const start = new Date(a.date);
      const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
      start.setHours(sh, sm, 0, 0);
      const now = Date.now();
      if (event === 'join' && String(actor).toLowerCase() === 'patient') {
        await createNotification(app, { userId: a.doctor, title: 'Patient Joined', message: 'Patient has joined and is waiting. Click Join Meet.', type: 'meet', link: '/doctor/dashboard', dedupeKey: `pt_join_${id}`, apptId: id });
        if (now > start.getTime()) {
          await createNotification(app, { userId: a.patient, title: 'Late Join', message: 'You are late. Remaining duration will be reduced automatically.', type: 'meet', link: '/appointments', dedupeKey: `late_${id}_p`, apptId: id });
        }
      } else if (event === 'join' && String(actor).toLowerCase() === 'doctor') {
        await createNotification(app, { userId: a.patient, title: 'Doctor Joined', message: 'Doctor is available and waiting. Join Meet now.', type: 'meet', link: '/appointments', dedupeKey: `doc_join_${id}`, apptId: id });
        if (now > start.getTime()) {
          await createNotification(app, { userId: a.doctor, title: 'Late Join', message: 'You are late. Remaining duration will be reduced automatically.', type: 'meet', link: '/doctor/dashboard', dedupeKey: `late_${id}_d`, apptId: id });
        }
      } else if (event === 'exit' && String(actor).toLowerCase() === 'patient') {
        await createNotification(app, { userId: a.doctor, title: 'Patient Left', message: 'Patient left the call. They may rejoin while time remains.', type: 'meet', link: '/doctor/dashboard', dedupeKey: `pt_exit_${id}`, apptId: id });
      } else if (event === 'exit' && String(actor).toLowerCase() === 'doctor') {
        await createNotification(app, { userId: a.patient, title: 'Doctor Left', message: 'Doctor left the call. Please wait or rejoin later.', type: 'meet', link: '/appointments', dedupeKey: `doc_exit_${id}`, apptId: id });
      }
    } catch (_) {}
  });
});

app.set('io', io);

const Appointment = require('./models/Appointment');
const { createNotification } = require('./utils/notify');


setInterval(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const now = Date.now();
    const list = await Appointment.find({ date: today, status: { $in: ['PENDING','CONFIRMED'] } }).populate('patient','name').populate('doctor','name');
    for (const a of list) {
      const id = String(a._id || a.id || '');
      const start = new Date(a.date);
      const [sh, sm] = String(a.startTime || '00:00').split(':').map((x) => Number(x));
      start.setHours(sh, sm, 0, 0);
      const end = new Date(a.date);
      const [eh, em] = String(a.endTime || a.startTime || '00:00').split(':').map((x) => Number(x));
      end.setHours(eh, em, 0, 0);
      const tenBefore = start.getTime() - 10 * 60 * 1000;
      const fiveRemain = end.getTime() - 5 * 60 * 1000;
      const oneRemain = end.getTime() - 60 * 1000;
      const windowMs = 5 * 60 * 1000; // 5 minutes for start notification
      const windowMsOther = 60000; // 1 minute for other notifications
      if (now >= tenBefore && now < tenBefore + windowMsOther) {
        await createNotification(app, { userId: a.doctor, title: 'Reminder', message: 'Your consultation starts in 10 minutes. Be ready to join.', type: 'reminder', link: '/doctor/dashboard', dedupeKey: `rem10_${id}` });
        await createNotification(app, { userId: a.patient, title: 'Reminder', message: 'Your consultation starts in 10 minutes. Be ready to join.', type: 'reminder', link: '/appointments', dedupeKey: `rem10p_${id}` });
      }
      if (now >= start.getTime() && now < start.getTime() + windowMs) {
        await createNotification(app, { userId: a.doctor, title: 'Join Meet', message: 'Join Meet is now available — click to start consultation.', type: 'meet', link: '/doctor/dashboard', dedupeKey: `remstart_${id}` });
        await createNotification(app, { userId: a.patient, title: 'Join Meet', message: 'Join Meet is now available — click to start consultation.', type: 'meet', link: '/appointments', dedupeKey: `remstartp_${id}` });
      }
      if (now >= fiveRemain && now < fiveRemain + windowMsOther) {
        await createNotification(app, { userId: a.doctor, title: 'Time Alert', message: 'Only 5 minutes left in your consultation.', type: 'timer', link: '/doctor/dashboard', dedupeKey: `rem5_${id}` });
        await createNotification(app, { userId: a.patient, title: 'Time Alert', message: 'Only 5 minutes left in your consultation.', type: 'timer', link: '/appointments', dedupeKey: `rem5p_${id}` });
      }
      if (now >= end.getTime() && a.status !== 'COMPLETED') {
        a.status = 'COMPLETED';
        await a.save();
        
        // Also update doctor status to online and not busy
        try {
          const DoctorProfile = require('./models/DoctorProfile');
          await DoctorProfile.findOneAndUpdate(
            { user: a.doctor },
            { isOnline: true, isBusy: false }
          );
        } catch(_) {}

        await createNotification(app, { userId: a.doctor, title: 'Session Ended', message: 'The appointment slot has ended. Session marked as completed.', type: 'info', link: '/doctor/dashboard', dedupeKey: `ended_${id}` });
        await createNotification(app, { userId: a.patient, title: 'Session Ended', message: 'The appointment slot has ended. Session marked as completed.', type: 'info', link: '/appointments', dedupeKey: `endedp_${id}` });
        // Emit socket to both so they close windows if open
        io.emit('meet:update', { apptId: id, actor: 'system', event: 'complete' });

      }
    }
  } catch (_) {}
}, 30000);


app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);


app.get('/', (req, res) => res.send('DoctorConnect API'));

let __sitemapCacheXml = '';
let __sitemapCacheAt = 0;
async function __buildSitemap(origin) {
  const DoctorProfile = require('./models/DoctorProfile');
  const User = require('./models/User');
  const urls = [];
  const add = (loc, changefreq, priority) => { urls.push({ loc, changefreq, priority }); };
  add(origin + '/', 'daily', '0.9');
  add(origin + '/about', 'monthly', '0.5');
  add(origin + '/contact', 'monthly', '0.5');
  add(origin + '/search', 'daily', '0.8');
  add(origin + '/login', 'monthly', '0.3');
  add(origin + '/register', 'monthly', '0.3');
  try {
    const specs = await DoctorProfile.distinct('specializations');
    (Array.isArray(specs) ? specs : []).map((s) => String(s || '').trim()).filter(Boolean).slice(0, 200).forEach((s) => {
      const q = encodeURIComponent(s);
      add(origin + '/search?specialization=' + q, 'weekly', '0.6');
    });
  } catch (_) {}
  try {
    const docs = await User.find({ role: 'doctor', isDoctorApproved: true }).select('_id').limit(5000);
    docs.forEach((u) => { add(origin + '/doctor/' + String(u._id), 'weekly', '0.6'); });
  } catch (_) {}
  const body = urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
app.get('/sitemap.xml', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  const now = Date.now();
  if (__sitemapCacheXml && (now - __sitemapCacheAt) < 12 * 60 * 60 * 1000) {
    res.type('application/xml').send(__sitemapCacheXml);
    return;
  }
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http');
  const host = req.get('host') || 'localhost:5000';
  const origin = `${proto}://${host}`;
  try {
    const xml = await __buildSitemap(origin);
    __sitemapCacheXml = xml;
    __sitemapCacheAt = now;
    res.type('application/xml').send(xml);
  } catch (e) {
    res.status(500).type('application/xml').send('');
  }
});

try {
  if (String(process.env.SERVE_CLIENT || '').trim() === '1') {
    const clientPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(clientPath, { maxAge: '30d', etag: true, lastModified: true }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  }
} catch (_) {}

// Public stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const Appointment = require('./models/Appointment');
    const User = require('./models/User');
    const DoctorProfile = require('./models/DoctorProfile');
    const appointments = await Appointment.countDocuments({});
    const doctors = await User.countDocuments({ role: 'doctor', isDoctorApproved: true });
    const patients = await User.countDocuments({ role: 'patient' });
    const distinctSpecs = await DoctorProfile.distinct('specializations');
    const specialties = (Array.isArray(distinctSpecs) ? distinctSpecs : [])
      .map((s) => String(s || '').trim())
      .filter(Boolean).length;
    res.json({ appointments, doctors, patients, specialties });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to fetch stats' });
  }
});


const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
