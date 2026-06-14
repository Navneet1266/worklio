const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const Card = require('../models/Card');
const Board = require('../models/Board');
const Workspace = require('../models/Workspace');
const auth = require('../middleware/auth');

const checkBoardAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId);
  if (!board) return { error: 'Board not found', status: 404 };
  const workspace = await Workspace.findById(board.workspace);
  const isMember = workspace?.members.some((m) => m.user.toString() === userId);
  if (!isMember) return { error: 'Access denied', status: 403 };
  return { board };
};

// GET /api/sprints/board/:boardId
router.get('/board/:boardId', auth, async (req, res) => {
  try {
    const { error, status } = await checkBoardAccess(req.params.boardId, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const sprints = await Sprint.find({ board: req.params.boardId }).sort({ order: 1, createdAt: 1 });
    res.json(sprints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sprints
router.post('/', auth, async (req, res) => {
  try {
    const { boardId, title, goal, startDate, endDate } = req.body;
    if (!boardId) return res.status(400).json({ message: 'boardId required' });

    const { error, status } = await checkBoardAccess(boardId, req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const count = await Sprint.countDocuments({ board: boardId });
    const sprint = await Sprint.create({
      title: title?.trim() || `Sprint ${count + 1}`,
      board: boardId,
      goal: goal || '',
      startDate: startDate || null,
      endDate: endDate || null,
      order: count,
    });

    const io = req.app.get('io');
    io.to(`board:${boardId}`).emit('sprint:created', sprint);

    res.status(201).json(sprint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sprints/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const { error, status } = await checkBoardAccess(sprint.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { title, goal, startDate, endDate } = req.body;
    if (title !== undefined) sprint.title = title.trim();
    if (goal !== undefined) sprint.goal = goal;
    if (startDate !== undefined) sprint.startDate = startDate || null;
    if (endDate !== undefined) sprint.endDate = endDate || null;
    await sprint.save();

    const io = req.app.get('io');
    io.to(`board:${sprint.board}`).emit('sprint:updated', sprint);

    res.json(sprint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sprints/:id/start
router.post('/:id/start', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const { error, status } = await checkBoardAccess(sprint.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    // Deactivate any currently active sprint on this board
    await Sprint.updateMany({ board: sprint.board, status: 'active' }, { status: 'planning' });

    sprint.status = 'active';
    if (!sprint.startDate) sprint.startDate = new Date();
    await sprint.save();

    const io = req.app.get('io');
    io.to(`board:${sprint.board}`).emit('sprint:updated', sprint);

    res.json(sprint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sprints/:id/complete
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const { error, status } = await checkBoardAccess(sprint.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    const { nextSprintId, comment } = req.body;

    // Find incomplete cards in this sprint
    const incompleteCards = await Card.find({
      sprint: sprint._id,
      progress: { $lt: 100 },
      archived: false,
    });

    if (incompleteCards.length > 0) {
      await Card.updateMany(
        { _id: { $in: incompleteCards.map((c) => c._id) } },
        {
          sprint: nextSprintId || null,
          $push: {
            sprintHistory: {
              sprint: sprint._id,
              sprintTitle: sprint.title,
              movedAt: new Date(),
              comment: comment || `Moved from ${sprint.title} (completed)`,
              movedBy: req.user._id,
            },
          },
        }
      );
    }

    sprint.status = 'completed';
    sprint.completedAt = new Date();
    await sprint.save();

    const io = req.app.get('io');
    io.to(`board:${sprint.board}`).emit('sprint:completed', {
      sprint,
      movedCount: incompleteCards.length,
      nextSprintId,
    });

    res.json({ sprint, movedCount: incompleteCards.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sprints/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found' });

    const { error, status } = await checkBoardAccess(sprint.board.toString(), req.user._id.toString());
    if (error) return res.status(status).json({ message: error });

    await Card.updateMany({ sprint: sprint._id }, { $unset: { sprint: 1 } });
    await sprint.deleteOne();

    const io = req.app.get('io');
    io.to(`board:${sprint.board}`).emit('sprint:deleted', { sprintId: sprint._id.toString() });

    res.json({ message: 'Sprint deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
