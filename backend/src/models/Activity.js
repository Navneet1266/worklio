const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'card_created', 'card_updated', 'card_moved', 'card_archived',
      'list_created', 'list_updated', 'list_archived',
      'board_created', 'board_updated',
      'member_added', 'member_removed',
      'comment_added', 'comment_deleted',
      'attachment_added', 'attachment_removed',
      'due_date_set', 'due_date_removed',
      'checklist_added', 'checklist_item_completed',
      'label_added', 'label_removed',
      'assignee_added', 'assignee_removed',
    ],
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
  card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
