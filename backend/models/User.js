const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['patient','doctor','admin'], default: 'patient' },
  isDoctorApproved: { type: Boolean, default: false },
  address: { type: String },
  gender: { type: String },
  birthday: { type: String },
  photoBase64: { type: String },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date },
}, { timestamps: true });

userSchema.index({ role: 1, isDoctorApproved: 1 });
userSchema.index({ name: 'text' }); // Text index for faster name search


module.exports = mongoose.model('User', userSchema);
