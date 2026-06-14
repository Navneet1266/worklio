const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { createNotification } = require('../services/notification');
const { sendCommentEmail } = require('../services/email');

const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: 'Board not found', status: 404 };
  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId);
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { board };
};

router.get('/card/:cardId', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const comments = await Comment.find({ card: req.params.cardId })
      .populate('author', 'name avatar email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { text, cardId } = req.body;
    if (!text?.trim() || !cardId) {
      return res.status(400).json({ message: 'Text and cardId required' });
    }

    const card = await Card.findById(cardId).populate('assignees', 'name email avatar').populate('watchers', 'name avatar');
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { board, error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const comment = await Comment.create({ text: text.trim(), card: cardId, author: req.user._id });
    await comment.populate('author', 'name avatar email');

    await logActivity({
      type: 'comment_added',
      userId: req.user._id,
      boardId: card.board,
      cardId: card._id,
      data: { commentText: text.substring(0, 100) },
    });

    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('comment:created', {
      comment,
      cardId,
      boardId: card.board,
    });

    // Notify card assignees (excluding commenter)
    for (const assignee of card.assignees) {
      if (assignee._id.toString() !== req.user._id.toString()) {
        const notification = await createNotification({
          recipient: assignee._id,
          sender: req.user._id,
          type: 'comment',
          message: `${req.user.name} commented on "${card.title}"`,
          link: `/board/${card.board}`,
          card: card._id,
          board: card.board,
        });
        io.to(`user:${assignee._id}`).emit('notification:new', notification);
        sendCommentEmail(assignee, comment, card, board, req.user);
      }
    }

    // Notify watchers (skip commenter + assignees already notified above)
    const notifiedIds = card.assignees.map(a => a._id.toString());
    for (const watcher of (card.watchers || [])) {
      const wId = watcher._id.toString();
      if (wId === req.user._id.toString() || notifiedIds.includes(wId)) continue;
      const notification = await createNotification({
        recipient: watcher._id,
        sender: req.user._id,
        type: 'comment',
        message: `${req.user.name} commented on "${card.title}"`,
        link: `/board/${card.board}`,
        card: card._id,
        board: card.board,
      });
      if (notification) io.to(`user:${wId}`).emit('notification:new', notification);
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text required' });

    comment.text = text.trim();
    comment.edited = true;
    await comment.save();
    await comment.populate('author', 'name avatar email');

    const card = await Card.findById(comment.card);
    const io = req.app.get('io');
    io.to(`board:${card?.board}`).emit('comment:updated', { comment, cardId: comment.card });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    const card = await Card.findById(comment.card);
    await comment.deleteOne();

    const io = req.app.get('io');
    io.to(`board:${card?.board}`).emit('comment:deleted', {
      commentId: req.params.id,
      cardId: comment.card,
      boardId: card?.board,
    });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
