const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const STAGING_DIR = path.join(UPLOAD_DIR, '.staging');

function filePath(dir, employeeId, filename) {
  if (!filename || path.basename(filename) !== filename) throw new Error('Invalid staged filename');
  return path.join(dir, String(employeeId), filename);
}

function collectStaged(value, files = []) {
  if (Array.isArray(value)) value.forEach(item => collectStaged(item, files));
  else if (value && typeof value === 'object') {
    if (value.staged === true && value.filename) files.push(value);
    else Object.values(value).forEach(item => collectStaged(item, files));
  }
  return files;
}

// Moves only Work Info files selected during the current employee submission.
// The caller keeps the returned moves so it can compensate if its DB transaction fails.
function promoteStagedWorkInfoDrafts(draftMap, employeeId) {
  const copy = JSON.parse(JSON.stringify(draftMap));
  const staged = collectStaged(copy);
  staged.forEach(file => {
    if (!fs.existsSync(filePath(STAGING_DIR, employeeId, file.filename))) {
      throw new Error(`Staged Work Info file is missing: ${file.originalName || file.filename}`);
    }
  });
  const moves = [];
  const visit = value => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    if (value.staged === true && value.filename) {
      const source = filePath(STAGING_DIR, employeeId, value.filename);
      const destination = filePath(UPLOAD_DIR, employeeId, value.filename);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.renameSync(source, destination);
      moves.push({ source, destination });
      const { staged, ...committed } = value;
      return { ...committed, url: `/api/local-upload/file/${employeeId}/${value.filename}` };
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
  };
  return {
    draftMap: visit(copy),
    moves,
    promoted: staged.map(({ staged, ...file }) => ({
      ...file,
      url: `/api/local-upload/file/${employeeId}/${file.filename}`,
    })),
  };
}

function rollbackPromotions(moves) {
  [...moves].reverse().forEach(({ source, destination }) => {
    try {
      if (fs.existsSync(destination)) {
        fs.mkdirSync(path.dirname(source), { recursive: true });
        fs.renameSync(destination, source);
      }
    } catch (_) { /* preserve original error; a manual orphan audit can recover a failed rollback */ }
  });
}

module.exports = { UPLOAD_DIR, STAGING_DIR, promoteStagedWorkInfoDrafts, rollbackPromotions };
