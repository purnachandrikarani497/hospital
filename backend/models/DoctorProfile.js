const mongoose = require('mongoose');


const doctorProfileSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
specializations: [String],
qualifications: [String],
experienceYears: Number,
about: String,
photoBase64: String,
registrationNumber: String,
clinic: {
name: String,
address: String,
city: String
},
consultationFees: Number,
languages: [String],
 weeklyAvailability: [{ day: Number, from: String, to: String }],
 slotDurationMins: { type: Number, default: 15 },
 isOnline: { type: Boolean, default: false },
 isBusy: { type: Boolean }
}, { timestamps: true });

doctorProfileSchema.index({ user: 1 });
doctorProfileSchema.index({ specializations: 1 });
doctorProfileSchema.index({ 'clinic.city': 1 });
doctorProfileSchema.index({ isOnline: 1 });
doctorProfileSchema.index({ 'clinic.name': 1 }); // Added index for faster clinic name search
doctorProfileSchema.index({ experienceYears: -1 }); // Added index for sorting by experience


module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
