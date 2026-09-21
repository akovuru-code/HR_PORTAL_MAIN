const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const pageMargin = 48;
const lineHeight = 16;
const dark = rgb(0.12, 0.16, 0.23);
const muted = rgb(0.35, 0.4, 0.48);

function dateLabel(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`));
}

function safeFilenamePart(value) {
  return String(value || 'Employee').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim() || 'Employee';
}

function wrap(text, font, size, width) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['—'];
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

async function createTimesheetPdf({ employeeName, weekStart, weekEnd, entries, status, statusReport, projectName, clientName }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = page.getHeight() - pageMargin;

  const newPage = () => { page = pdf.addPage([612, 792]); y = page.getHeight() - pageMargin; };
  const ensure = height => { if (y - height < pageMargin) newPage(); };
  const text = (value, x, options = {}) => {
    const size = options.size || 10;
    page.drawText(String(value || '—'), { x, y, size, font: options.bold ? bold : regular, color: options.color || dark });
  };
  const rule = () => { page.drawLine({ start: { x: pageMargin, y: y - 6 }, end: { x: page.getWidth() - pageMargin, y: y - 6 }, thickness: 1, color: rgb(0.84, 0.87, 0.91) }); y -= 18; };

  text('Employee Timesheet', pageMargin, { size: 20, bold: true });
  y -= 28;
  text(`Employee: ${employeeName}`, pageMargin, { size: 11, bold: true });
  y -= lineHeight;
  text(`Period: ${dateLabel(weekStart)} - ${dateLabel(weekEnd)}`, pageMargin, { size: 10 });
  y -= lineHeight;
  text(`Status: ${status || '—'}`, pageMargin, { size: 10 });
  y -= lineHeight;
  text(`Client Name: ${clientName || '—'}`, pageMargin, { size: 10 });
  y -= lineHeight;
  text(`Project Name: ${projectName || '—'}`, pageMargin, { size: 10 });
  y -= 8;
  rule();

  const columns = [pageMargin, 130, 255, 390, 470];
  text('Date', columns[0], { bold: true, size: 9 });
  text('Project', columns[1], { bold: true, size: 9 });
  text('Client', columns[2], { bold: true, size: 9 });
  text('Hours', columns[3], { bold: true, size: 9 });
  text('Status', columns[4], { bold: true, size: 9 });
  y -= lineHeight;
  rule();

  const dailyTotals = new Map();
  for (const entry of entries) {
    ensure(36);
    text(entry.dateKey, columns[0], { size: 8.5 });
    text(wrap(entry.project || '—', regular, 8.5, 115)[0], columns[1], { size: 8.5 });
    text(wrap(entry.client || '—', regular, 8.5, 125)[0], columns[2], { size: 8.5 });
    text(Number(entry.hours || 0).toFixed(2), columns[3], { size: 8.5 });
    text(entry.status || '—', columns[4], { size: 8.5 });
    dailyTotals.set(entry.dateKey, (dailyTotals.get(entry.dateKey) || 0) + Number(entry.hours || 0));
    y -= lineHeight;
  }
  const totalHours = [...dailyTotals.values()].reduce((sum, hours) => sum + hours, 0);
  ensure(48);
  rule();
  text(`Total Hours: ${totalHours.toFixed(2)}`, pageMargin, { bold: true, size: 11 });
  y -= 28;
  ensure(90);
  text('Weekly Status Report', pageMargin, { bold: true, size: 11 });
  y -= lineHeight;
  for (const line of wrap(statusReport || 'No weekly status provided.', regular, 10, page.getWidth() - (pageMargin * 2))) {
    ensure(lineHeight);
    text(line, pageMargin, { size: 10, color: muted });
    y -= lineHeight;
  }
  return pdf.save();
}

async function createMonthlyTimesheetPdf({ employeeName, monthStart, monthEnd, weeks }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = page.getHeight() - pageMargin;

  const newPage = () => { page = pdf.addPage([612, 792]); y = page.getHeight() - pageMargin; };
  const ensure = height => { if (y - height < pageMargin) newPage(); };
  const text = (value, x, options = {}) => {
    const size = options.size || 10;
    page.drawText(String(value || '—'), { x, y, size, font: options.bold ? bold : regular, color: options.color || dark });
  };
  const rule = () => { page.drawLine({ start: { x: pageMargin, y: y - 6 }, end: { x: page.getWidth() - pageMargin, y: y - 6 }, thickness: 1, color: rgb(0.84, 0.87, 0.91) }); y -= 18; };
  const writeReport = report => {
    text('Weekly Status Report', pageMargin, { bold: true, size: 10 });
    y -= lineHeight;
    for (const line of wrap(report || 'No weekly status provided.', regular, 9, page.getWidth() - (pageMargin * 2))) {
      ensure(lineHeight);
      text(line, pageMargin, { size: 9, color: muted });
      y -= lineHeight;
    }
  };

  text('Employee Monthly Timesheet', pageMargin, { size: 20, bold: true });
  y -= 28;
  text(`Employee: ${employeeName}`, pageMargin, { size: 11, bold: true });
  y -= lineHeight;
  text(`Period: ${dateLabel(monthStart)} - ${dateLabel(monthEnd)}`, pageMargin, { size: 10 });
  y -= 8;
  rule();

  let monthlyTotal = 0;
  for (const week of weeks) {
    ensure(94);
    text(`Week: ${dateLabel(week.periodStart)} - ${dateLabel(week.periodEnd)}`, pageMargin, { bold: true, size: 12 });
    y -= lineHeight;
    text(`Status: ${week.status || '—'}`, pageMargin, { size: 9 });
    y -= lineHeight;
    rule();

    const columns = [pageMargin, 120, 245, 380, 468];
    text('Date', columns[0], { bold: true, size: 8.5 });
    text('Project', columns[1], { bold: true, size: 8.5 });
    text('Client', columns[2], { bold: true, size: 8.5 });
    text('Hours', columns[3], { bold: true, size: 8.5 });
    text('Status', columns[4], { bold: true, size: 8.5 });
    y -= lineHeight;
    rule();

    let weeklyTotal = 0;
    for (const entry of week.entries) {
      ensure(30);
      text(entry.dateKey, columns[0], { size: 8 });
      text(wrap(entry.project || '—', regular, 8, 112)[0], columns[1], { size: 8 });
      text(wrap(entry.client || '—', regular, 8, 125)[0], columns[2], { size: 8 });
      text(Number(entry.hours || 0).toFixed(2), columns[3], { size: 8 });
      text(entry.status || '—', columns[4], { size: 8 });
      weeklyTotal += Number(entry.hours || 0);
      y -= lineHeight;
    }
    monthlyTotal += weeklyTotal;
    ensure(80);
    rule();
    text(`Weekly / Period Total: ${weeklyTotal.toFixed(2)}`, pageMargin, { bold: true, size: 10 });
    y -= 24;
    writeReport(week.statusReport);
    y -= 12;
  }

  ensure(38);
  rule();
  text(`Monthly Total Hours: ${monthlyTotal.toFixed(2)}`, pageMargin, { bold: true, size: 12 });
  return pdf.save();
}

module.exports = { createTimesheetPdf, createMonthlyTimesheetPdf, safeFilenamePart };
