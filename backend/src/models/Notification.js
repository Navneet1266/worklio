const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['assignment', 'comment', 'due_date', 'member_added', 'board_invite', 'mention'],
    required: true,
  },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
