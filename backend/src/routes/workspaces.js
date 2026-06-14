const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const Board = require('../models/Board');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createNotification } = require('../services/notification');

const populateWorkspace = (query) =>
  query
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar');

const requireAdmin = (workspace, userId) => {
  const member = workspace.members.find((m) => m.user._id?.toString() === userId || m.user.toString() === userId);
  return member && (member.role === 'admin' || workspace.owner.toString() === userId);
};

router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await populateWorkspace(
      Workspace.find({
        $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      })
    );
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });

    const workspace = await Workspace.create({
      name: name.trim(),
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });
    res.status(201).json(await populateWorkspace(Workspace.findById(workspace._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const workspace = await populateWorkspace(Workspace.findById(req.params.id));
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isMember = workspace.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    res.json(workspace);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!requireAdmin(workspace, req.user._id.toString())) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, description } = req.body;
    if (name) workspace.name = name.trim();
    if (description !== undefined) workspace.description = description;
    await workspace.save();
    res.json(await populateWorkspace(Workspace.findById(workspace._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the owner can delete this workspace' });
    }
    await Board.deleteMany({ workspace: workspace._id });
    await workspace.deleteOne();
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/members', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!requireAdmin(workspace, req.user._id.toString())) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { email, role = 'member' } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No user found with that email' });

    const alreadyMember = workspace.members.some((m) => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member' });

    workspace.members.push({ user: user._id, role });
    await workspace.save();

    const notification = await createNotification({
      recipient: user._id,
      sender: req.user._id,
      type: 'member_added',
      message: `${req.user.name} added you to workspace "${workspace.name}"`,
      link: `/workspace/${workspace._id}`,
    });

    const io = req.app.get('io');
    io.to(`user:${user._id}`).emit('notification:new', notification);

    res.json(await populateWorkspace(Workspace.findById(workspace._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/members/:userId', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (!requireAdmin(workspace, req.user._id.toString())) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const member = workspace.members.find((m) => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (workspace.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot change owner role' });
    }

    member.role = req.body.role;
    await workspace.save();
    res.json(await populateWorkspace(Workspace.findById(workspace._id)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isSelf = req.params.userId === req.user._id.toString();
    if (!isSelf && !requireAdmin(workspace, req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (workspace.owner.toString() === req.params.userId) {
      return res.status(400).json({ message: 'Cannot remove workspace owner' });
    }

    workspace.members = workspace.members.filter((m) => m.user.toString() !== req.params.userId);
    await workspace.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/boards', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isMember = workspace.members.some((m) => m.user.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ message: 'Access denied' });

    const boards = await Board.find({ workspace: req.params.id, archived: false })
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
