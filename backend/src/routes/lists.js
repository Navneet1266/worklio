const express = require('express');
const router = express.Router();
const List = require('../models/List');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activity');

const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: 'Board not found', status: 404 };
  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId);
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { board };
};

router.post('/', auth, async (req, res) => {
  try {
    const { title, boardId } = req.body;
    if (!title?.trim() || !boardId) {
      return res.status(400).json({ message: 'Title and boardId required' });
    }

    const { board, error, status } = await checkBoardAccess(boardId, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const lastList = await List.findOne({ board: boardId }).sort({ position: -1 });
    const position = lastList ? lastList.position + 1000 : 0;

    const list = await List.create({ title: title.trim(), board: boardId, position });

    await logActivity({ type: 'list_created', userId: req.user._id, boardId, data: { title: list.title } });

    const io = req.app.get('io');
    io.to(`board:${boardId}`).emit('list:created', { list: { ...list.toObject(), cards: [] }, boardId });

    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const { error, status } = await checkBoardAccess(list.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { title } = req.body;
    if (title) list.title = title.trim();
    await list.save();

    const io = req.app.get('io');
    io.to(`board:${list.board}`).emit('list:updated', { list, boardId: list.board });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const { error, status } = await checkBoardAccess(list.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    await Card.deleteMany({ list: list._id });
    await list.deleteOne();

    const io = req.app.get('io');
    io.to(`board:${list.board}`).emit('list:deleted', { listId: list._id, boardId: list.board });

    res.json({ message: 'List deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    const { error, status } = await checkBoardAccess(list.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    list.archived = !list.archived;
    await list.save();

    const io = req.app.get('io');
    io.to(`board:${list.board}`).emit('list:updated', { list, boardId: list.board });

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
