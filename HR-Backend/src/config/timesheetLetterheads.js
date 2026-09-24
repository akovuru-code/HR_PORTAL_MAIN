const path = require('path');
const { resolveCompanyTemplateKey } = require('./invoiceTemplates');

const assetDirectory = path.join(__dirname, '..', '..', 'assets', 'timesheet-letterheads');

// Margins are measured from the physical edge of the converted source
// letterhead PDFs. They leave clear space for each supplied header and footer.
const letterheads = {
  siritek: { asset: 'siritek.pdf', content: { top: 108, right: 48, bottom: 92, left: 48 } },
  gannu: { asset: 'gannu.pdf', content: { top: 116, right: 54, bottom: 118, left: 54 } },
  savvy: { asset: 'savvy.pdf', content: { top: 108, right: 48, bottom: 92, left: 48 } },
  global: { asset: 'global.pdf', content: { top: 108, right: 48, bottom: 100, left: 48 } },
};

function getTimesheetLetterhead(company) {
  const key = resolveCompanyTemplateKey(company);
  const letterhead = key ? letterheads[key] : null;
  if (!letterhead) return null;
  return { key, assetPath: path.join(assetDirectory, letterhead.asset), content: letterhead.content };
}

module.exports = { getTimesheetLetterhead };
