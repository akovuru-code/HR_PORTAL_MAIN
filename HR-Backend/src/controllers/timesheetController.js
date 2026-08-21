const fs = require('fs');
const pdfParse = require('pdf-parse');
const Timesheet = require('../models/timesheet');
const AuditLog = require('../models/auditLog');

exports.uploadTimesheet = async (req, res) => {
  try {
    console.debug('[timesheet] upload called - Authorization header:', req.headers && req.headers.authorization);
    console.debug('[timesheet] req.user (if auth passed):', req.user);
    console.debug('[timesheet] req.file present?', !!req.file);

    if (!req.file) {
      console.debug('[timesheet] missing req.file');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const mime = req.file.mimetype || '';
    console.debug('[timesheet] uploaded file info:', { originalname: req.file.originalname, mimetype: mime, path: filePath });

    if (mime.startsWith('image/')) {
      console.debug('[timesheet] received image, OCR not implemented');
      return res.status(400).json({ success: false, message: 'Image uploads are not supported yet. Please upload a PDF.' });
    }

    if (mime !== 'application/pdf' && !/\.pdf$/i.test(req.file.originalname)) {
      console.debug('[timesheet] unsupported file type', mime, req.file.originalname);
      return res.status(400).json({ success: false, message: 'Unsupported file type. Please upload a PDF.' });
    }

    // Parse PDF
    let text = '';
    try {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      text = data && data.text ? data.text : '';
      console.debug('[timesheet] pdf-parse text length:', text ? text.length : 0);
      if (text && text.length > 400) console.debug('[timesheet] pdf text preview:', text.slice(0, 400));
    } catch (err) {
      console.error('[timesheet] pdf-parse error', err);
      return res.status(500).json({ success: false, message: 'Error parsing PDF' });
    }

    if (!text || !text.trim()) {
      console.debug('[timesheet] no text extracted from pdf (scanned?)');
      return res.status(422).json({ success: false, message: 'No text extracted from PDF (scanned PDF?). OCR required.' });
    }

    // Heuristic extraction (tolerant)
    const extract = (patterns) => {
      for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1].trim();
      }
      return null;
    };

    const employeeName = extract([/Employee\s*Name[:\-]\s*(.+)/i, /Name[:\-]\s*(.+)/i]);
    const employeeId = extract([/Employee\s*(?:ID|No|#)[:\-]\s*([A-Za-z0-9\-]+)/i, /Emp(?:loyee)?\s*(?:ID|No|#)[:\-]\s*([A-Za-z0-9\-]+)/i]);
    const projectName = extract([/Project(?:\s*Name)?[:\-]\s*(.+)/i, /ENGAGEMENT[:\-]\s*(.+)/i]);
    const clientName = extract([/Client(?:\s*Name)?[:\-]\s*(.+)/i, /Customer[:\-]\s*(.+)/i]);
    const role = extract([/Role[:\-]\s*(.+)/i, /Designation[:\-]\s*(.+)/i]);
    const hours = extract([/Hours[:\-]\s*([0-9]+(?:\.[0-9]+)?)/i, /Total\s*Hours[:\-]\s*([0-9]+(?:\.[0-9]+)?)/i, /Hrs[:\-]\s*([0-9]+(?:\.[0-9]+)?)/i, /Worked\s*([0-9]+(?:\.[0-9]+)?)\s*hours?/i]);

    const extracted = { employeeName, employeeId, projectName, clientName, role, hours };
    console.debug('[timesheet] extracted fields:', extracted);

    const meaningful = (hours && hours.trim()) || (projectName && projectName.trim()) || (employeeId && employeeId.trim()) || (employeeName && employeeName.trim());
    if (!meaningful) {
      console.debug('[timesheet] extraction yielded no meaningful fields');
      return res.status(422).json({ success: false, message: 'Could not extract structured timesheet fields from PDF.' });
    }

    // Save lightweight metadata (optional)
    try {
      const record = await Timesheet.create({
        employeeId: employeeId || null,
        employeeName: employeeName || null,
        projectName: projectName || null,
        clientName: clientName || null,
        role: role || null,
        hours: hours ? parseFloat(hours) : null,
        filePath: filePath,
      });
      try { await AuditLog.create({ entity: 'Timesheet', entityId: record.id, action: 'upload', actorId: req.user?.id || null, payload: { file: req.file.originalname } }); } catch (e) { /* non-fatal */ }
      return res.json({ success: true, extractedData: extracted, recordId: record.id });
    } catch (dbErr) {
      console.error('[timesheet] DB error', dbErr);
      return res.status(500).json({ success: false, message: 'Failed to save parsed timesheet' });
    }

  } catch (err) {
    console.error('[timesheet] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Server error parsing timesheet' });
  }
};