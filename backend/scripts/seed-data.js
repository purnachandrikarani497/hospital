
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

(async () => {
  await connectDB();

  // Create a new doctor
  const doctorUser = await User.create({
    name: 'Dr. Smith',
    email: 'dr.smith@example.com',
    passwordHash: await require('bcrypt').hash('password123', 10),
    role: 'doctor',
    isDoctorApproved: true,
  });

  const doctorProfile = await DoctorProfile.create({
    user: doctorUser._id,
    specializations: ['General Physician'],
    clinic: { name: 'Central Clinic', address: '123 Main St', city: 'Anytown' },
    consultationFees: 50,
    slotDurationMins: 30,
    experienceYears: 10,
    about: 'Experienced general physician.',
    isOnline: true,
  });

  // Create a new patient
  const patientUser = await User.create({
    name: 'John Doe',
    email: 'john.doe@example.com',
    passwordHash: await require('bcrypt').hash('password123', 10),
    role: 'patient',
  });

  // Create a new appointment
  const appointment = await Appointment.create({
    doctor: doctorUser._id,
    patient: patientUser._id,
    date: new Date(),
    startTime: '10:00',
    endTime: '10:30',
    status: 'CONFIRMED',
  });

  console.log('Database seeded with sample data.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
