const mongoose = require('mongoose');

const sprintSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  goal: { type: String, default: '' },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['planning', 'active', 'completed'], default: 'planning' },
  completedAt: { type: Date },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Sprint', sprintSchema);
