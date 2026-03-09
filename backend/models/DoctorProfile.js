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
 isOnline: { type: Boolean, default: true },
 isBusy: { type: Boolean }
}, { timestamps: true });

doctorProfileSchema.index({ user: 1 });
doctorProfileSchema.index({ specializations: 1 });
doctorProfileSchema.index({ 'clinic.city': 1 });
doctorProfileSchema.index({ isOnline: 1 });


module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
