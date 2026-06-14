const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email skipped - not configured] To: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || 'Trello Clone <noreply@trelloclone.com>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const sendAssignmentEmail = (user, card, board, assigner) =>
  sendEmail({
    to: user.email,
    subject: `You were assigned to "${card.title}"`,
    html: `
      <h2>New Card Assignment</h2>
      <p>Hi ${user.name},</p>
      <p><strong>${assigner.name}</strong> assigned you to the card <strong>"${card.title}"</strong> on board <strong>${board.title}</strong>.</p>
      <p><a href="${process.env.CLIENT_URL}/board/${board._id}">View Board</a></p>
    `,
  });

const sendCommentEmail = (user, comment, card, board, commenter) =>
  sendEmail({
    to: user.email,
    subject: `New comment on "${card.title}"`,
    html: `
      <h2>New Comment</h2>
      <p>Hi ${user.name},</p>
      <p><strong>${commenter.name}</strong> commented on <strong>"${card.title}"</strong>:</p>
      <blockquote>${comment.text}</blockquote>
      <p><a href="${process.env.CLIENT_URL}/board/${board._id}">View Board</a></p>
    `,
  });

module.exports = { sendEmail, sendAssignmentEmail, sendCommentEmail };
