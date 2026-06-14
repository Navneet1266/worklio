const express = require('express');
const router = express.Router();
const path = require('path');
const Card = require('../models/Card');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { logActivity } = require('../services/activity');

router.post('/card/:cardId', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
    };

    card.attachments.push(attachment);
    await card.save();

    await logActivity({
      type: 'attachment_added',
      userId: req.user._id,
      boardId: card.board,
      cardId: card._id,
      data: { filename: req.file.originalname },
    });

    const io = req.app.get('io');
    await card.populate('assignees', 'name email avatar');
    await card.populate('createdBy', 'name avatar');
    io.to(`board:${card.board}`).emit('card:updated', { card, boardId: card.board });

    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/card/:cardId/:attachmentId', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const attachment = card.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    card.attachments.pull(req.params.attachmentId);
    await card.save();

    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card, boardId: card.board });

    res.json({ message: 'Attachment removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
