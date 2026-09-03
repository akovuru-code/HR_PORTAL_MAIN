const supportedFields = ['invoiceDate', 'invoiceNumber', 'dueDate', 'paymentTerms', 'poNumber', 'billTo', 'items', 'balanceDue', 'total'];

// All coordinates use a top-left origin and are measured from the approved
// 612 x 792 point source pages. The source assets provide all static artwork,
// labels, rules, borders, margins, and footer content.
const layouts = {
  siritek: {
    page: { width: 612, height: 792 },
    metadata: { date: { x: 431, top: 147, width: 55, height: 12 }, invoiceNumber: { x: 494, top: 147, width: 78, height: 12 }, dueDate: { x: 431, top: 193, width: 55, height: 12 }, paymentTerms: { x: 494, top: 193, width: 78, height: 12 }, poNumber: { x: 494, top: 216, width: 78, height: 12 } },
    billTo: { x: 36, top: 220, width: 249, headerHeight: 23, bodyHeight: 85 },
    table: { bodyTop: 360, rowHeight: 22, maxRows: 10, columns: [{ key: 'name', x: 36, width: 112 }, { key: 'description', x: 148, width: 244 }, { key: 'hours', x: 392, width: 50 }, { key: 'rate', x: 442, width: 54 }, { key: 'amount', x: 496, width: 80 }] },
    balanceDue: { x: 500, top: 581, width: 72 }, total: { x: 500, top: 612, width: 72, fontSize: 8.5 },
  },
  gannu: {
    page: { width: 612, height: 792 },
    metadata: { date: { x: 431, top: 147, width: 55, height: 12 }, invoiceNumber: { x: 494, top: 147, width: 78, height: 12 }, dueDate: { x: 431, top: 193, width: 55, height: 12 }, paymentTerms: { x: 494, top: 193, width: 78, height: 12 }, poNumber: { x: 494, top: 216, width: 78, height: 12 } },
    billTo: { x: 36, top: 220, width: 249, headerHeight: 23, bodyHeight: 85 },
    table: { bodyTop: 360, rowHeight: 22, maxRows: 10, columns: [{ key: 'name', x: 36, width: 112 }, { key: 'description', x: 148, width: 244 }, { key: 'hours', x: 392, width: 50 }, { key: 'rate', x: 442, width: 54 }, { key: 'amount', x: 496, width: 80 }] },
    balanceDue: { x: 500, top: 581, width: 72 }, total: { x: 500, top: 612, width: 72, fontSize: 8, fontWeight: 'bold' },
  },
  savvy: {
    page: { width: 612, height: 792 },
    metadata: { date: { x: 431, top: 147, width: 55, height: 12 }, invoiceNumber: { x: 494, top: 147, width: 78, height: 12 }, dueDate: { x: 431, top: 193, width: 55, height: 12 }, paymentTerms: { x: 494, top: 193, width: 78, height: 12 }, poNumber: { x: 494, top: 216, width: 78, height: 12 } },
    billTo: { x: 36, top: 220, width: 249, headerHeight: 23, bodyHeight: 85 },
    table: { bodyTop: 360, rowHeight: 22, maxRows: 10, columns: [{ key: 'name', x: 36, width: 112 }, { key: 'description', x: 148, width: 244 }, { key: 'hours', x: 392, width: 50 }, { key: 'rate', x: 442, width: 54 }, { key: 'amount', x: 496, width: 80 }] },
    balanceDue: { x: 500, top: 581, width: 72 }, total: { x: 500, top: 612, width: 72, fontSize: 8.5 },
  },
  global: {
    page: { width: 612, height: 792 },
    metadata: { date: { x: 431, top: 147, width: 55, height: 12 }, invoiceNumber: { x: 494, top: 147, width: 78, height: 12 }, dueDate: { x: 431, top: 193, width: 55, height: 12 }, paymentTerms: { x: 494, top: 193, width: 78, height: 12 }, poNumber: { x: 494, top: 216, width: 78, height: 12 } },
    billTo: { x: 36, top: 220, width: 249, headerHeight: 23, bodyHeight: 85 },
    table: { bodyTop: 360, rowHeight: 22, maxRows: 10, columns: [{ key: 'name', x: 36, width: 112 }, { key: 'description', x: 148, width: 244 }, { key: 'hours', x: 392, width: 50 }, { key: 'rate', x: 442, width: 54 }, { key: 'amount', x: 496, width: 80 }] },
    balanceDue: { x: 500, top: 581, width: 72 }, total: { x: 500, top: 612, width: 72, fontSize: 8.5 },
  },
};

const templates = {
  siritek: { label: 'Siritek Invoice Template', asset: 'siritek.pdf', layout: layouts.siritek, fields: supportedFields },
  gannu: { label: 'Gannu Software Invoice Template', asset: 'gannu.pdf', layout: layouts.gannu, fields: supportedFields },
  savvy: { label: 'Savvy Invoice Template', asset: 'savvy.pdf', layout: layouts.savvy, fields: supportedFields },
  global: { label: 'Global Infotech Invoice Template', asset: 'global-infotech.pdf', background: 'global-infotech.png', layout: layouts.global, fields: supportedFields },
};

const companyIdToTemplate = { 1: 'siritek', 2: 'gannu', 3: 'savvy', 4: 'global' };
const companyNameAliases = { siritek: 'siritek', gannu: 'gannu', savvy: 'savvy', globalinfotech: 'global' };

function normalizeCompanyName(name = '') { return String(name).toLowerCase().replace(/[^a-z0-9]/g, ''); }

function getInvoiceTemplate(company) {
  const id = company?.id ?? company?.company_id;
  const name = normalizeCompanyName(company?.name || company);
  const key = companyIdToTemplate[id] || Object.entries(companyNameAliases).find(([alias]) => name.includes(alias))?.[1];
  if (!key) throw new Error(`No invoice template is configured for company ${company?.name || id || 'unknown'}`);
  return { key, ...templates[key] };
}

module.exports = { getInvoiceTemplate, layouts };
