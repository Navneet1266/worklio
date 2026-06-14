const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const Sprint = require('../models/Sprint');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');
const { createNotification } = require('../services/notification');
const { sendAssignmentEmail } = require('../services/email');

const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: 'Board not found', status: 404 };
  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId);
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { board };
};

const populateCard = (query) =>
  query
    .populate('assignees', 'name email avatar')
    .populate('createdBy', 'name avatar')
    .populate('attachments.uploadedBy', 'name avatar')
    .populate('sprint', 'title status startDate endDate')
    .populate('dependencies', 'title cardType priority _id list');

router.post('/', auth, async (req, res) => {
  try {
    const { title, listId, boardId } = req.body;
    if (!title?.trim() || !listId || !boardId) {
      return res.status(400).json({ message: 'Title, listId, and boardId required' });
    }

    const { error, status } = await checkBoardAccess(boardId, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const lastCard = await Card.findOne({ list: listId }).sort({ position: -1 });
    const position = lastCard ? lastCard.position + 1000 : 0;

    const card = await Card.create({
      title: title.trim(),
      list: listId,
      board: boardId,
      position,
      createdBy: req.user._id,
    });

    await logActivity({
      type: 'card_created',
      userId: req.user._id,
      boardId,
      cardId: card._id,
      data: { title: card.title },
    });

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${boardId}`).emit('card:created', { card: populated, listId, boardId });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/cards/my-tasks — all incomplete cards assigned to current user
router.get('/my-tasks', auth, async (req, res) => {
  try {
    const cards = await Card.find({ assignees: req.user._id, progress: { $lt: 100 }, archived: { $ne: true } })
      .populate('list', 'title')
      .populate('board', 'title background')
      .populate('sprint', 'title status')
      .populate('assignees', 'name email avatar')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();
    res.json(cards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const card = await populateCard(Card.findById(req.params.id));
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const {
      title, description, dueDate, startDate, labels, coverColor,
      priority, cardType, storyPoints, progress, sprint, dependencies,
    } = req.body;
    if (title !== undefined) card.title = title.trim();
    if (description !== undefined) card.description = description;
    if (dueDate !== undefined) card.dueDate = dueDate || null;
    if (startDate !== undefined) card.startDate = startDate || null;
    if (labels !== undefined) card.labels = labels;
    if (coverColor !== undefined) card.coverColor = coverColor;
    if (priority !== undefined) card.priority = priority;
    if (cardType !== undefined) card.cardType = cardType;
    if (storyPoints !== undefined) card.storyPoints = storyPoints;
    if (sprint !== undefined) card.sprint = sprint || null;
    if (dependencies !== undefined) card.dependencies = dependencies;
    if (progress !== undefined) {
      card.progress = progress;
      if (progress >= 100 && !card.completedAt) card.completedAt = new Date();
      else if (progress < 100) card.completedAt = undefined;
    }
    await card.save();

    await logActivity({
      type: 'card_updated',
      userId: req.user._id,
      boardId: card.board,
      cardId: card._id,
      data: { title: card.title },
    });

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cards/:id/move-sprint — move card to a different sprint with a comment
router.post('/:id/move-sprint', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { targetSprintId, comment } = req.body;

    // Record previous sprint in history
    if (card.sprint) {
      const currentSprint = await Sprint.findById(card.sprint);
      if (currentSprint) {
        card.sprintHistory.push({
          sprint: card.sprint,
          sprintTitle: currentSprint.title,
          movedAt: new Date(),
          comment: comment || '',
          movedBy: req.user._id,
        });
      }
    }

    card.sprint = targetSprintId || null;
    await card.save();

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/move', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { listId, position } = req.body;
    const oldListId = card.list.toString();
    card.list = listId;
    card.position = position;
    await card.save();

    await logActivity({
      type: 'card_moved',
      userId: req.user._id,
      boardId: card.board,
      cardId: card._id,
      data: { fromList: oldListId, toList: listId },
    });

    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:moved', {
      cardId: card._id,
      fromListId: oldListId,
      toListId: listId,
      position,
      boardId: card.board,
    });

    res.json(card);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reorder', auth, async (req, res) => {
  try {
    const { cardOrders } = req.body;
    if (!Array.isArray(cardOrders)) {
      return res.status(400).json({ message: 'cardOrders array required' });
    }

    await Promise.all(
      cardOrders.map(({ id, position, listId }) =>
        Card.findByIdAndUpdate(id, { position, list: listId })
      )
    );

    const card = await Card.findById(cardOrders[0]?.id);
    if (card) {
      const io = req.app.get('io');
      io.to(`board:${card.board}`).emit('card:reordered', { cardOrders, boardId: card.board });
    }

    res.json({ message: 'Cards reordered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/assignees', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { userId } = req.body;
    if (card.assignees.map((a) => a.toString()).includes(userId)) {
      return res.status(400).json({ message: 'User already assigned' });
    }

    card.assignees.push(userId);
    await card.save();

    const board = await Board.findById(card.board);
    const notification = await createNotification({
      recipient: userId,
      sender: req.user._id,
      type: 'assignment',
      message: `${req.user.name} assigned you to "${card.title}"`,
      link: `/board/${card.board}`,
      card: card._id,
      board: card.board,
    });

    const io = req.app.get('io');
    io.to(`user:${userId}`).emit('notification:new', notification);

    const populated = await populateCard(Card.findById(card._id));
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });

    await sendAssignmentEmail(
      { email: req.body.email || '', name: '' },
      card,
      board,
      req.user
    );

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/assignees/:userId', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    card.assignees = card.assignees.filter((a) => a.toString() !== req.params.userId);
    await card.save();

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/checklists', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { title } = req.body;
    card.checklists.push({ title, items: [] });
    await card.save();

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/checklists/:checklistId/items', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });

    checklist.items.push({ text: req.body.text, completed: false });
    await card.save();

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/checklists/:checklistId/items/:itemId', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const checklist = card.checklists.id(req.params.checklistId);
    if (!checklist) return res.status(404).json({ message: 'Checklist not found' });

    const item = checklist.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (req.body.completed !== undefined) item.completed = req.body.completed;
    if (req.body.text) item.text = req.body.text;
    await card.save();

    const populated = await populateCard(Card.findById(card._id));
    const io = req.app.get('io');
    io.to(`board:${card.board}`).emit('card:updated', { card: populated, boardId: card.board });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { error, status } = await checkBoardAccess(card.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const listId = card.list.toString();
    const boardId = card.board.toString();
    await card.deleteOne();

    const io = req.app.get('io');
    io.to(`board:${boardId}`).emit('card:deleted', { cardId: req.params.id, listId, boardId });

    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
