const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  message: { type: String, required: true },
  type: { type: String },
  kind: { type: String },
  link: { type: String },
  apptId: { type: String },
  read: { type: Boolean, default: false },
  dedupeKey: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
