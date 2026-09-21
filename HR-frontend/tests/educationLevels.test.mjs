import test from 'node:test';
import assert from 'node:assert/strict';
import { EDUCATION_LEVELS, normalizeEducation, educationFromServer, mergeEducationDraft } from '../src/utils/educationLevels.js';

test('five independent empty cards have the required order and stable identities', () => {
  assert.deepEqual(EDUCATION_LEVELS.map(level => level.label), ["Master's", 'Degree', "Bachelor's", 'Class 12th', 'High School']);
  const entries = normalizeEducation();
  assert.equal(entries.length, 5);
  assert.equal(new Set(entries.map(entry => entry.id)).size, 5);
  entries[0].address.city = 'Boston';
  assert.equal(entries[1].address.city, '');
  assert.ok(entries.every(entry => entry.degree === ''));
});

test('known legacy levels map without changing the entered degree or record IDs', () => {
  const input = ['M.Sc.', 'Degree', 'B.Tech', 'Class 12th', 'High School'].map((degree, i) => ({ id: i + 1, degree }));
  const result = normalizeEducation(input.reverse());
  assert.deepEqual(result.map(entry => entry.id), [1, 2, 3, 4, 5]);
  assert.equal(result[0].degree, 'M.Sc.');
  assert.equal(result[2].degree, 'B.Tech');
});

test('ambiguous and duplicate qualifications survive multiple draft round trips', () => {
  const input = [
    { id: 1, degree: 'Medicine', docFile: { url: '/medicine.pdf' } },
    { id: 2, degree: 'MBA' }, { id: 3, degree: 'MS' },
    { id: 4, degree: 'MBA', educationLevel: 'masters' },
  ];
  const first = normalizeEducation(input);
  assert.equal(first[0].id, 4);
  assert.equal(first.filter(entry => entry.legacy).length, 3);
  const second = normalizeEducation(JSON.parse(JSON.stringify(first)));
  assert.deepEqual(second, first);
  assert.equal(second.find(entry => entry.id === 1).docFile.url, '/medicine.pdf');
});

test('server mapping exposes the first attachment consistently and keeps all others', () => {
  const result = educationFromServer({ education_id: 8, degree: 'MS', uploads: [
    { id: 7, file_url: '/second.pdf', file_name: 'second.pdf' },
    { id: 2, file_url: '/first.pdf', file_name: 'first.pdf' },
  ] });
  assert.equal(result.docFile.id, 2);
  assert.equal(result.additionalUploads[0].id, 7);
});

test('draft edits preserve server-only records and extra attachments', () => {
  const server = [
    { id: 1, degree: 'MS', educationLevel: 'masters', additionalUploads: [{ id: 3, file_url: '/extra.pdf' }] },
    { id: 2, degree: 'Medicine' },
  ];
  const result = mergeEducationDraft(server, [{ id: 1, degree: 'MSc', educationLevel: 'masters' }]);
  assert.equal(result[0].degree, 'MSc');
  assert.equal(result[0].additionalUploads[0].id, 3);
  assert.ok(result.some(entry => entry.id === 2));
});

test('temporary fixed-card IDs reconcile with saved IDs and retain explicit file removal', () => {
  const result = mergeEducationDraft([{ id: 9, educationLevel: 'bachelors', degree: 'BA', docFile: { url: '/saved.pdf' } }],
    [{ id: 'level-bachelors', educationLevel: 'bachelors', degree: 'BSc', docFile: null }]);
  assert.equal(result.length, 5);
  assert.equal(result[2].id, 9);
  assert.equal(result[2].docFile, null);
  assert.equal(result[2].degree, 'BSc');
});
