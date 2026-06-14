const Activity = require('../models/Activity');

const logActivity = async ({ type, userId, boardId, cardId, data = {} }) => {
  try {
    const activity = await Activity.create({
      type,
      user: userId,
      board: boardId,
      card: cardId,
      data,
    });
    return activity;
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
