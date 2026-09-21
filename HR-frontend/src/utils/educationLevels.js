export const EDUCATION_LEVELS = [
  { key: 'masters', label: "Master's" },
  { key: 'degree', label: 'Degree' },
  { key: 'bachelors', label: "Bachelor's" },
  { key: 'class12', label: 'Class 12th' },
  { key: 'highSchool', label: 'High School' },
];

export const emptyEducation = (level) => ({
  id: `level-${level}`, educationLevel: level, legacy: false,
  degree: '', university: '', major: '', startDate: '', endDate: '',
  address: { street: '', city: '', state: '', zipCode: '' }, docFile: null,
});

export function inferEducationLevel(degree = '') {
  if (typeof degree !== 'string') return null;
  const value = degree.toLowerCase().replace(/[.’']/g, '').trim();
  if (/^(masters?\b|msc\b|ms\b|ma\b|mba\b|mtech\b|me\b|mca\b|mcom\b)/.test(value)) return 'masters';
  if (/^(bachelors?\b|bsc\b|bs\b|ba\b|btech\b|be\b|bba\b|bca\b|bcom\b)/.test(value)) return 'bachelors';
  if (/^(class\s*12(th)?|12th|higher secondary|senior secondary|hsc|intermediate)$/.test(value)) return 'class12';
  if (/^(high school|class\s*10(th)?|10th|ssc|secondary school)$/.test(value)) return 'highSchool';
  if (value === 'degree') return 'degree';
  return null;
}

// Keep every legacy record, even when its level is ambiguous or already occupied.
export function normalizeEducation(records = []) {
  const slots = new Map(EDUCATION_LEVELS.map(({ key }) => [key, emptyEducation(key)]));
  const occupied = new Set();
  const legacy = [];
  const entries = records.filter(Boolean).map((record, index) => ({
    ...emptyEducation('degree'), ...record,
    id: record.id ?? record.education_id ?? `legacy-${index}`,
    educationLevel: record.educationLevel ?? record.education_level ?? null,
    address: { ...emptyEducation('degree').address, ...record.address },
  }));
  // Explicitly saved slots take priority over inferred legacy qualifications.
  for (const record of [...entries.filter(e => e.educationLevel), ...entries.filter(e => !e.educationLevel)]) {
    const level = record.legacy ? null : (record.educationLevel || inferEducationLevel(record.degree));
    if (slots.has(level) && !occupied.has(level)) {
      slots.set(level, { ...record, educationLevel: level, legacy: false });
      occupied.add(level);
    } else {
      legacy.push({ ...record, legacy: true });
    }
  }
  return [...slots.values(), ...legacy];
}

export function educationFromServer(record) {
  const uploads = [...(record.uploads || [])].sort((a, b) => a.id - b.id);
  return {
    id: record.education_id, educationLevel: record.education_level,
    degree: record.degree || '', university: record.university || '', major: record.major || '',
    startDate: record.start_date || '', endDate: record.end_date || '',
    address: { street: record.street || '', city: record.city || '', state: record.state || '', zipCode: record.zip_code || '' },
    docFile: uploads[0] ? {
      id: uploads[0].id, url: uploads[0].file_url,
      filename: uploads[0].file_name, originalName: uploads[0].file_name,
    } : null,
    additionalUploads: uploads.slice(1),
    primaryUploadId: uploads[0]?.id ?? null,
  };
}

// Drafts may predate records already in the database; never discard those records.
export function mergeEducationDraft(serverRecords, draftRecords) {
  const remaining = [...serverRecords];
  const merged = draftRecords.filter(Boolean).map(draft => {
    let index = remaining.findIndex(record => String(record.id) === String(draft.id));
    if (index < 0 && draft.educationLevel && !draft.legacy) {
      index = remaining.findIndex(record => record.educationLevel === draft.educationLevel);
    }
    if (index < 0) return draft;
    const [saved] = remaining.splice(index, 1);
    return { ...saved, ...draft, id: saved.id, additionalUploads: saved.additionalUploads };
  });
  return normalizeEducation([...merged, ...remaining]);
}
