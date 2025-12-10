const mongoose = require('mongoose');


const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  type: { type: String, enum: ['online','offline'], default: 'offline' },
  status: { type: String, enum: ['PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW'], default: 'PENDING' },
  paymentStatus: { type: String, enum: ['PAID','PENDING','FAILED'], default: 'PENDING' },
  fee: { type: Number },
  beneficiaryType: { type: String, enum: ['self','family'], default: 'self' },
  beneficiaryName: { type: String },
  meetingLink: { type: String },
  prescriptionText: { type: String },
  patientSymptoms: { type: String },
  patientSummary: { type: String },
  patientReports: [{
    name: { type: String },
    url: { type: String }
  }],
  ratingStars: { type: Number, min: 1, max: 5 },
  ratingText: { type: String },
  ratedAt: { type: Date }
}, { timestamps: true });


module.exports = mongoose.model('Appointment', appointmentSchema);
