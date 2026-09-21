const fs = require('fs');
const path = require('path');
const Company = require('../models/company');
const PerformanceReviewTemplate = require('../models/performanceReviewTemplate');

const TEMPLATE_ROOT = path.join(__dirname, '..', '..', 'private_uploads', 'performance-reports');
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// These names intentionally match the canonical company values currently stored
// in PostgreSQL.  The frontend never consumes this mapping.
const INITIAL_TEMPLATES = [
  ['Siritek Inc', 'MID_YEAR', 'Performance review Report Siritek - Jun 2026.docx', 'templates/siritek/2026/MID_YEAR/siritek-mid-year-2026.docx'],
  ['Siritek Inc', 'YEAR_END', 'Performance Review Report Siritek - Dec 2026.docx', 'templates/siritek/2026/YEAR_END/siritek-year-end-2026.docx'],
  ['Gannusoftware', 'MID_YEAR', 'Performance review Report Gannu - Jun 2026.docx', 'templates/gannu/2026/MID_YEAR/gannu-mid-year-2026.docx'],
  ['Gannusoftware', 'YEAR_END', 'Performance Review Report Gannu - Dec 2026.docx', 'templates/gannu/2026/YEAR_END/gannu-year-end-2026.docx'],
  ['Savvyinfosystems', 'MID_YEAR', 'Performance review Report Savvy - Jun 2026.docx', 'templates/savvy/2026/MID_YEAR/savvy-mid-year-2026.docx'],
  ['Savvyinfosystems', 'YEAR_END', 'Performance review Report Savvy - Dec 2026.docx', 'templates/savvy/2026/YEAR_END/savvy-year-end-2026.docx'],
  ['Globalinfotech Inc', 'MID_YEAR', 'Performance review Report Global - Jun 2026.docx', 'templates/global/2026/MID_YEAR/global-mid-year-2026.docx'],
  ['Globalinfotech Inc', 'YEAR_END', 'Performance Review Report Global - Dec 2026.docx', 'templates/global/2026/YEAR_END/global-year-end-2026.docx'],
];

async function seedPerformanceReviewTemplates() {
  for (const [companyName, reviewType, originalFilename, storageKey] of INITIAL_TEMPLATES) {
    const company = await Company.findOne({ where: { name: companyName } });
    const fullPath = path.resolve(TEMPLATE_ROOT, storageKey);
    if (!company || !fullPath.startsWith(TEMPLATE_ROOT + path.sep) || !fs.existsSync(fullPath)) continue;
    const fileSize = fs.statSync(fullPath).size;
    await PerformanceReviewTemplate.findOrCreate({
      where: { companyId: company.id, reviewType, reviewYear: 2026, version: 1 },
      defaults: { originalFilename, storedFilename: path.basename(fullPath), storageKey, mimeType: DOCX_MIME, fileSize, isActive: true },
    });
  }
}

module.exports = { seedPerformanceReviewTemplates, TEMPLATE_ROOT, DOCX_MIME };
