const nodemailer = require('nodemailer');

const COMPANY_MAIL_CONFIG = {
  'Siritek Inc': { service: 'gmail', user: process.env.SIRITEK_EMAIL, pass: process.env.SIRITEK_PASS, displayName: 'Siritek Inc HR Team' },
  Gannusoftware: { service: 'gmail', user: process.env.GANNU_EMAIL, pass: process.env.GANNU_PASS, displayName: 'Gannusoftware HR Team' },
  Savvyinfosystems: { service: 'zoho', user: process.env.SAVVY_EMAIL, pass: process.env.SAVVY_PASS, displayName: 'Savvyinfosystems HR Team' },
  'Globalinfotech Inc': { service: 'gmail', user: process.env.GLOBAL_EMAIL, pass: process.env.GLOBAL_PASS, displayName: 'Globalinfotech HR Team' },
};

const DEFAULT_COMPANY = 'Siritek Inc';

function getCompanyMailConfig(company) {
  return COMPANY_MAIL_CONFIG[String(company || '').trim()] || COMPANY_MAIL_CONFIG[DEFAULT_COMPANY];
}

function getCompanyTransporter(company) {
  const config = getCompanyMailConfig(company);
  if (!config.user || !config.pass) throw new Error(`Email is not configured for ${String(company || DEFAULT_COMPANY).trim() || DEFAULT_COMPANY}.`);
  if (config.service === 'zoho') {
    return nodemailer.createTransport({
      host: 'smtp.zoho.com', port: 465, secure: true,
      auth: { user: config.user, pass: config.pass },
    });
  }
  return nodemailer.createTransport({ service: 'gmail', auth: { user: config.user, pass: config.pass } });
}

async function sendCompanyEmail({ company, to, subject, text, html }) {
  const config = getCompanyMailConfig(company);
  const transporter = getCompanyTransporter(company);
  return transporter.sendMail({ from: `"${config.displayName}" <${config.user}>`, to, subject, text, html });
}

module.exports = { DEFAULT_COMPANY, getCompanyMailConfig, getCompanyTransporter, sendCompanyEmail };
