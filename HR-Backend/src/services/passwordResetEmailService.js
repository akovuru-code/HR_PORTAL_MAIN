const { sendCompanyEmail } = require('./companyMailService');

async function sendPasswordResetEmail({ to, token, company }) {
  const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
  const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendCompanyEmail({
    company,
    to,
    subject: 'Password Reset Approved',
    text: `Your password reset request was approved. Use this secure link to choose a new password:\n\n${resetLink}\n\nThis link expires in 30 minutes and can be used once. If you did not request this reset, contact your administrator.`,
    html: `<p>Your password reset request was approved.</p><p><a href="${resetLink}">Create a new password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request this reset, contact your administrator.</p>`,
  });
}

module.exports = { sendPasswordResetEmail };
