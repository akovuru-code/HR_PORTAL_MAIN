const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

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
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

async function createBrandedWriter(letterhead) {
  if (!letterhead?.assetPath || !fs.existsSync(letterhead.assetPath)) {
    throw new Error('The registered company does not have a configured Timesheet letterhead.');
  }
  const templateBytes = await fs.promises.readFile(letterhead.assetPath);
  const template = await PDFDocument.load(templateBytes);
  if (!template.getPageCount()) throw new Error('The configured Timesheet letterhead is empty.');

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page;
  let y;

  const newPage = async () => {
    const pageTemplate = await PDFDocument.load(templateBytes);
    const [brandedTemplate] = await pdf.embedPdf(pageTemplate, [0]);
    page = pdf.addPage([brandedTemplate.width, brandedTemplate.height]);
    page.drawPage(brandedTemplate);
    y = page.getHeight() - letterhead.content.top;
  };
  const text = (value, x, options = {}) => {
    const size = options.size || 10;
    page.drawText(String(value || '—'), { x, y, size, font: options.bold ? bold : regular, color: options.color || dark });
  };
  const rule = () => {
    page.drawLine({ start: { x: letterhead.content.left, y: y - 6 }, end: { x: page.getWidth() - letterhead.content.right, y: y - 6 }, thickness: 1, color: rgb(0.84, 0.87, 0.91) });
    y -= 18;
  };
  const columns = () => {
    const left = letterhead.content.left;
    const width = page.getWidth() - letterhead.content.left - letterhead.content.right;
    return [left, left + width * 0.17, left + width * 0.43, left + width * 0.71, left + width * 0.86];
  };

  return {
    pdf, regular, newPage, text, rule, columns,
    get y() { return y; }, set y(value) { y = value; }, get page() { return page; },
    get bottom() { return letterhead.content.bottom; },
    get contentWidth() { return page.getWidth() - letterhead.content.left - letterhead.content.right; },
    get left() { return letterhead.content.left; },
  };
}

function drawTableHeader(writer, columns, size = 9) {
  writer.text('Date', columns[0], { bold: true, size });
  writer.text('Project', columns[1], { bold: true, size });
  writer.text('Client', columns[2], { bold: true, size });
  writer.text('Hours', columns[3], { bold: true, size });
  writer.text('Status', columns[4], { bold: true, size });
  writer.y -= lineHeight;
  writer.rule();
}

function drawEntry(writer, entry, columns, size) {
  writer.text(entry.dateKey, columns[0], { size });
  writer.text(wrap(entry.project || '—', writer.regular, size, columns[2] - columns[1] - 10)[0], columns[1], { size });
  writer.text(wrap(entry.client || '—', writer.regular, size, columns[3] - columns[2] - 10)[0], columns[2], { size });
  writer.text(Number(entry.hours || 0).toFixed(2), columns[3], { size });
  writer.text(entry.status || '—', columns[4], { size });
  writer.y -= lineHeight;
}

async function createTimesheetPdf({ employeeName, weekStart, weekEnd, entries, status, statusReport, projectName, clientName, letterhead }) {
  const writer = await createBrandedWriter(letterhead);
  const drawDocumentHeader = async (continued = false) => {
    await writer.newPage();
    writer.text(continued ? 'Employee Timesheet (continued)' : 'Employee Timesheet', writer.left, { size: 20, bold: true });
    writer.y -= 28;
    writer.text(`Employee: ${employeeName}`, writer.left, { size: 11, bold: true }); writer.y -= lineHeight;
    writer.text(`Period: ${dateLabel(weekStart)} - ${dateLabel(weekEnd)}`, writer.left, { size: 10 }); writer.y -= lineHeight;
    writer.text(`Status: ${status || '—'}`, writer.left, { size: 10 }); writer.y -= lineHeight;
    writer.text(`Client Name: ${clientName || '—'}`, writer.left, { size: 10 }); writer.y -= lineHeight;
    writer.text(`Project Name: ${projectName || '—'}`, writer.left, { size: 10 }); writer.y -= 8;
    writer.rule();
    drawTableHeader(writer, writer.columns());
  };

  await drawDocumentHeader();
  const dailyTotals = new Map();
  for (const entry of entries) {
    if (writer.y - 36 < writer.bottom) await drawDocumentHeader(true);
    drawEntry(writer, entry, writer.columns(), 8.5);
    dailyTotals.set(entry.dateKey, (dailyTotals.get(entry.dateKey) || 0) + Number(entry.hours || 0));
  }
  const totalHours = [...dailyTotals.values()].reduce((sum, hours) => sum + hours, 0);
  if (writer.y - 48 < writer.bottom) await drawDocumentHeader(true);
  writer.rule();
  writer.text(`Total Hours: ${totalHours.toFixed(2)}`, writer.left, { bold: true, size: 11 });
  writer.y -= 28;
  if (writer.y - 90 < writer.bottom) await writer.newPage();
  writer.text('Weekly Status Report', writer.left, { bold: true, size: 11 });
  writer.y -= lineHeight;
  for (const line of wrap(statusReport || 'No weekly status provided.', writer.regular, 10, writer.contentWidth)) {
    if (writer.y - lineHeight < writer.bottom) {
      await writer.newPage();
      writer.text('Weekly Status Report (continued)', writer.left, { bold: true, size: 11 });
      writer.y -= lineHeight;
    }
    writer.text(line, writer.left, { size: 10, color: muted });
    writer.y -= lineHeight;
  }
  return writer.pdf.save();
}

async function createMonthlyTimesheetPdf({ employeeName, monthStart, monthEnd, weeks, letterhead }) {
  const writer = await createBrandedWriter(letterhead);
  const drawDocumentHeader = async (continued = false) => {
    await writer.newPage();
    writer.text(continued ? 'Employee Monthly Timesheet (continued)' : 'Employee Monthly Timesheet', writer.left, { size: 20, bold: true });
    writer.y -= 28;
    writer.text(`Employee: ${employeeName}`, writer.left, { size: 11, bold: true }); writer.y -= lineHeight;
    writer.text(`Period: ${dateLabel(monthStart)} - ${dateLabel(monthEnd)}`, writer.left, { size: 10 }); writer.y -= 8;
    writer.rule();
  };
  const drawWeekHeader = week => {
    writer.text(`Week: ${dateLabel(week.periodStart)} - ${dateLabel(week.periodEnd)}`, writer.left, { bold: true, size: 12 }); writer.y -= lineHeight;
    writer.text(`Status: ${week.status || '—'}`, writer.left, { size: 9 }); writer.y -= lineHeight;
    writer.rule();
    drawTableHeader(writer, writer.columns(), 8.5);
  };

  await drawDocumentHeader();
  let monthlyTotal = 0;
  for (const week of weeks) {
    if (writer.y - 94 < writer.bottom) await drawDocumentHeader(true);
    drawWeekHeader(week);
    let weeklyTotal = 0;
    for (const entry of week.entries) {
      if (writer.y - 30 < writer.bottom) {
        await drawDocumentHeader(true);
        drawWeekHeader(week);
      }
      drawEntry(writer, entry, writer.columns(), 8);
      weeklyTotal += Number(entry.hours || 0);
    }
    monthlyTotal += weeklyTotal;
    if (writer.y - 80 < writer.bottom) await drawDocumentHeader(true);
    writer.rule();
    writer.text(`Weekly / Period Total: ${weeklyTotal.toFixed(2)}`, writer.left, { bold: true, size: 10 });
    writer.y -= 24;
    writer.text('Weekly Status Report', writer.left, { bold: true, size: 10 }); writer.y -= lineHeight;
    for (const line of wrap(week.statusReport || 'No weekly status provided.', writer.regular, 9, writer.contentWidth)) {
      if (writer.y - lineHeight < writer.bottom) {
        await writer.newPage();
        writer.text('Weekly Status Report (continued)', writer.left, { bold: true, size: 10 }); writer.y -= lineHeight;
      }
      writer.text(line, writer.left, { size: 9, color: muted }); writer.y -= lineHeight;
    }
    writer.y -= 12;
  }
  if (writer.y - 38 < writer.bottom) await drawDocumentHeader(true);
  writer.rule();
  writer.text(`Monthly Total Hours: ${monthlyTotal.toFixed(2)}`, writer.left, { bold: true, size: 12 });
  return writer.pdf.save();
}

module.exports = { createTimesheetPdf, createMonthlyTimesheetPdf, safeFilenamePart };
