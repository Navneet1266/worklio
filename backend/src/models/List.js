const mongoose = require('mongoose');

const listSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  position: { type: Number, required: true, default: 0 },
  archived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('List', listSchema);
