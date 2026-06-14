const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
}, { _id: true });

const checklistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  items: [checklistItemSchema],
}, { _id: true });

const cardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
  position: { type: Number, required: true, default: 0 },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  labels: [{
    text: { type: String, default: '' },
    color: { type: String, default: '#61bd4f' },
    _id: false,
  }],
  dueDate: { type: Date },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    mimetype: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  checklists: [checklistSchema],
  coverColor: { type: String, default: '' },
  priority: { type: String, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
  cardType: { type: String, enum: ['task', 'bug', 'feature', 'improvement', 'epic'], default: 'task' },
  storyPoints: { type: Number, default: null },
  startDate: { type: Date },
  sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
  completedAt: { type: Date },
  sprintHistory: [{
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
    sprintTitle: { type: String },
    movedAt: { type: Date, default: Date.now },
    comment: { type: String, default: '' },
    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    _id: false,
  }],
  archived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);
