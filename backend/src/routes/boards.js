const express = require('express');
const router = express.Router();
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Workspace = require('../models/Workspace');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: 'Board not found', status: 404 };
  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId);
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { board, workspace };
};

router.post('/', auth, async (req, res) => {
  try {
    const { title, workspaceId, background, description } = req.body;
    if (!title?.trim() || !workspaceId) {
      return res.status(400).json({ message: 'Title and workspaceId required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    const isMember = workspace.members.some((m) => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const board = await Board.create({
      title: title.trim(),
      description,
      background: background || '#0079bf',
      workspace: workspaceId,
      members: [req.user._id],
    });

    await logActivity({ type: 'board_created', userId: req.user._id, boardId: board._id, data: { title: board.title } });
    await board.populate('members', 'name email avatar');
    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { board, error, status } = await checkBoardAccess(req.params.id, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    await board.populate('members', 'name email avatar');

    const lists = await List.find({ board: board._id, archived: false }).sort('position');
    const cards = await Card.find({ board: board._id, archived: false })
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name avatar')
      .sort('position');

    const listsWithCards = lists.map((list) => ({
      ...list.toObject(),
      cards: cards.filter((c) => c.list.toString() === list._id.toString()),
    }));

    res.json({ board, lists: listsWithCards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { board, error, status } = await checkBoardAccess(req.params.id, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { title, description, background } = req.body;
    if (title) board.title = title.trim();
    if (description !== undefined) board.description = description;
    if (background) board.background = background;
    await board.save();

    const io = req.app.get('io');
    io.to(`board:${board._id}`).emit('board:updated', { board });

    res.json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const { board, error, status } = await checkBoardAccess(req.params.id, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    await Card.deleteMany({ board: board._id });
    await List.deleteMany({ board: board._id });
    await board.deleteOne();
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/star', auth, async (req, res) => {
  try {
    const { board, error, status } = await checkBoardAccess(req.params.id, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const isStarred = board.starred.includes(req.user._id);
    if (isStarred) {
      board.starred = board.starred.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      board.starred.push(req.user._id);
    }
    await board.save();
    res.json({ starred: !isStarred });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/activity', auth, async (req, res) => {
  try {
    const { error, status } = await checkBoardAccess(req.params.id, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const activities = await Activity.find({ board: req.params.id })
      .populate('user', 'name avatar')
      .populate('card', 'title')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reorder-lists', auth, async (req, res) => {
  try {
    const { listOrders } = req.body;
    if (!Array.isArray(listOrders)) {
      return res.status(400).json({ message: 'listOrders array required' });
    }

    await Promise.all(
      listOrders.map(({ id, position }) =>
        List.findByIdAndUpdate(id, { position })
      )
    );

    const io = req.app.get('io');
    io.to(`board:${req.params.id}`).emit('list:reordered', { boardId: req.params.id, listOrders });
    res.json({ message: 'Lists reordered' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
