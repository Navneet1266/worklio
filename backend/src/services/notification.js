const Notification = require('../models/Notification');

const createNotification = async ({ recipient, sender, type, message, link, card, board }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      message,
      link,
      card,
      board,
    });
    await notification.populate('sender', 'name avatar');
    return notification;
  } catch (err) {
    console.error('Notification create error:', err.message);
  }
};

module.exports = { createNotification };
