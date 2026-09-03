const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { getInvoiceTemplate } = require('../config/invoiceTemplates');
const { formatCurrency } = require('../config/currencies');

const invoicesDirectory = path.join(__dirname, '..', '..', 'uploads', 'invoices');
const templateDirectory = path.join(__dirname, '..', '..', 'assets', 'invoice-templates');
const black = rgb(0.08, 0.1, 0.14);
const unicodeFontPath = process.env.INVOICE_UNICODE_FONT_PATH || path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'Nirmala.ttf');
const unicodeBoldFontPath = process.env.INVOICE_UNICODE_BOLD_FONT_PATH || path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'NirmalaB.ttf');

function money(value, currency) {
  return formatCurrency(value, currency);
}

async function embedInvoiceFonts(document) {
  if (!fs.existsSync(unicodeFontPath)) {
    throw new Error(`A Unicode invoice font is required at ${unicodeFontPath}. Set INVOICE_UNICODE_FONT_PATH to a TrueType font that includes the Indian Rupee symbol.`);
  }
  document.registerFontkit(fontkit);
  const font = await document.embedFont(await fs.promises.readFile(unicodeFontPath), { subset: true });
  const boldFont = fs.existsSync(unicodeBoldFontPath)
    ? await document.embedFont(await fs.promises.readFile(unicodeBoldFontPath), { subset: true })
    : font;
  return { font, boldFont };
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
}

function safeEmployeeName(value) {
  return String(value || 'Employee').replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim() || 'Employee';
}

function downloadFilename(invoice) {
  const billingPeriodDate = invoice.billingFromDate || invoice.invoiceDate || invoice.billingToDate || invoice.generatedDate;
  const date = new Date(`${String(billingPeriodDate || '').slice(0, 10)}T00:00:00`);
  const employeeName = safeEmployeeName(invoice.employeeName);
  if (Number.isNaN(date.getTime())) return `${employeeName} Invoice.pdf`;
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
  return `${employeeName} ${month} ${date.getFullYear()} Invoice.pdf`;
}

function fitText(text, font, size, width) {
  const value = String(text ?? '');
  if (font.widthOfTextAtSize(value, size) <= width) return value;
  let shortened = value;
  while (shortened.length && font.widthOfTextAtSize(`${shortened}...`, size) > width) shortened = shortened.slice(0, -1);
  return `${shortened}...`;
}

function drawTopText(page, text, x, top, font, size, options = {}) {
  if (!text) return;
  const textWidth = font.widthOfTextAtSize(String(text), size);
  const alignedX = options.align === 'right' && options.width
    ? x + options.width - textWidth
    : options.align === 'center' && options.width
      ? x + ((options.width - textWidth) / 2)
      : x;
  const baseline = options.height
    ? page.getHeight() - top - ((options.height + size) / 2)
    : page.getHeight() - top - size;
  page.drawText(String(text), { x: alignedX, y: baseline, size, font, color: black });
}

function wrapText(text, font, size, width) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  words.forEach(word => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  return lines;
}

function drawMetadata(page, invoice, layout, font) {
  const terms = invoice.paymentTerms === 'Custom' ? `Net ${invoice.customPaymentDays || ''}` : invoice.paymentTerms;
  const values = { date: formatDate(invoice.invoiceDate), invoiceNumber: invoice.invoiceNumber, dueDate: formatDate(invoice.dueDate), paymentTerms: terms, poNumber: invoice.poNumber };
  Object.entries(layout.metadata).forEach(([field, cell]) => {
    drawTopText(page, fitText(values[field], font, 8, cell.width), cell.x, cell.top, font, 8, { width: cell.width, height: cell.height, align: 'center' });
  });
}

function drawBillTo(page, invoice, layout, font) {
  const { x, top, width, headerHeight } = layout.billTo;
  const lines = [invoice.billToCompany, invoice.billingContactName, invoice.billingEmail, invoice.billingAddress]
    .filter(Boolean)
    .flatMap(value => String(value).split(/\r?\n/));
  lines.slice(0, 5).forEach((line, index) => drawTopText(page, line, x + 10, top + headerHeight + 10 + (index * 12), font, 8.5, { width: width - 20 }));
}

function drawItems(page, items, invoice, layout, font) {
  const { table } = layout;
  const [name, description, hours, rate, amount] = table.columns;
  items.slice(0, table.maxRows).forEach((item, index) => {
    const top = table.bodyTop + 8 + (index * table.rowHeight);
    drawTopText(page, fitText(item.name, font, 7.5, name.width - 8), name.x + 4, top, font, 7.5, { width: name.width - 8 });
    wrapText(item.description, font, 7.5, description.width - 8).slice(0, 2).forEach((line, lineIndex) => {
      drawTopText(page, line, description.x + 4, top + (lineIndex * 9), font, 7.5, { width: description.width - 8 });
    });
    drawTopText(page, fitText(item.hours ?? 0, font, 7.5, hours.width - 6), hours.x + 3, top, font, 7.5, { width: hours.width - 6, align: 'right' });
    drawTopText(page, fitText(money(item.rate, invoice.currency), font, 7.5, rate.width - 6), rate.x + 3, top, font, 7.5, { width: rate.width - 6, align: 'right' });
    drawTopText(page, fitText(money(item.amount, invoice.currency), font, 7.5, amount.width - 6), amount.x + 3, top, font, 7.5, { width: amount.width - 6, align: 'right' });
  });
}

function drawTotals(page, invoice, layout, font, boldFont) {
  drawTopText(page, fitText(money(invoice.balanceDue, invoice.currency), font, 8.5, layout.balanceDue.width), layout.balanceDue.x, layout.balanceDue.top, font, 8.5, { width: layout.balanceDue.width, align: 'right' });
  const totalFontSize = layout.total.fontSize || 8.5;
  const totalValue = money(invoice.total, invoice.currency);
  const totalFont = layout.total.fontWeight === 'regular' ? font : boldFont;
  drawTopText(page, fitText(totalValue, totalFont, totalFontSize, layout.total.width), layout.total.x, layout.total.top, totalFont, totalFontSize, { width: layout.total.width, align: 'right' });
}

async function generateInvoicePdf({ invoice, items, company }) {
  await fs.promises.mkdir(invoicesDirectory, { recursive: true });
  const version = Number(invoice.pdfVersion || 0) + 1;
  const filename = `invoice_${invoice.id}_v${version}.pdf`;
  const outputPath = path.join(invoicesDirectory, filename);
  const template = getInvoiceTemplate(company || invoice.companyName);
  const templatePath = path.join(templateDirectory, template.asset);
  if (!fs.existsSync(templatePath)) throw new Error(`Invoice template asset is missing: ${template.asset}`);

  const document = await PDFDocument.create();
  if (template.background) {
    const backgroundPath = path.join(templateDirectory, template.background);
    if (!fs.existsSync(backgroundPath)) throw new Error(`Invoice template background is missing: ${template.background}`);
    const background = await document.embedPng(await fs.promises.readFile(backgroundPath));
    const page = document.addPage([template.layout.page.width, template.layout.page.height]);
    page.drawImage(background, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  } else {
    const source = await PDFDocument.load(await fs.promises.readFile(templatePath));
    const [templatePage] = await document.copyPages(source, [0]);
    document.addPage(templatePage);
  }

  if (template.fields.length) {
    const page = document.getPage(0);
    const { font, boldFont } = await embedInvoiceFonts(document);
    drawMetadata(page, invoice, template.layout, font);
    drawBillTo(page, invoice, template.layout, font);
    drawItems(page, items, invoice, template.layout, font);
    drawTotals(page, invoice, template.layout, font, boldFont);
  }

  await fs.promises.writeFile(outputPath, await document.save());
  return { filename, outputPath, version, downloadName: downloadFilename(invoice), templateKey: template.key, templateName: template.label };
}

module.exports = { generateInvoicePdf, invoicesDirectory, downloadFilename, drawBillTo, money };
