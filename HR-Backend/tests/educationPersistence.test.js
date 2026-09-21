const { persistEducation } = require('../src/utils/educationPersistence');

function model(primaryKey, rows = []) {
  const state = [];
  const wrap = data => {
    const row = { ...data };
    row.update = jest.fn(async values => Object.assign(row, values));
    row.destroy = jest.fn(async () => state.splice(state.indexOf(row), 1));
    return row;
  };
  rows.forEach(row => state.push(wrap(row)));
  return {
    state,
    findAll: jest.fn(async ({ where }) => state.filter(row => Object.entries(where).every(([key, value]) =>
      Array.isArray(value) ? value.includes(row[key]) : row[key] === value))),
    create: jest.fn(async values => {
      const row = wrap({ ...values, [primaryKey]: Math.max(0, ...state.map(item => item[primaryKey])) + 1 });
      state.push(row);
      return row;
    }),
  };
}

function setup(educations = [], uploads = [], certifications = []) {
  return { employeeId: 42, transaction: { marker: 'transaction' },
    Education: model('education_id', educations), Upload: model('id', uploads),
    Certification: model('certification_id', certifications) };
}

test('empty fixed cards do not create database records', async () => {
  const context = setup();
  await persistEducation({ ...context, payload: { educationList: ['masters', 'degree', 'bachelors', 'class12', 'highSchool'].map(educationLevel => ({ educationLevel, degree: '', address: {} })) } });
  expect(context.Education.state).toHaveLength(0);
});

test('empty placeholders cannot claim or erase existing qualifications and attachments', async () => {
  const context = setup([
    { education_id: 1, employee_id: 42 },
    { education_id: 2, employee_id: 42, education_level: 'masters', degree: 'MS' },
  ], [{ id: 1, education_id: 1, file_url: '/legacy.pdf' }]);
  await persistEducation({ ...context, payload: { educationList: [
    { id: 'level-degree', educationLevel: 'degree', degree: '', docFile: null },
    { id: 'level-masters', educationLevel: 'masters', degree: '', docFile: null },
  ] } });
  expect(context.Education.state[0].update).not.toHaveBeenCalled();
  expect(context.Education.state[1].degree).toBe('MS');
  expect(context.Upload.state[0].file_url).toBe('/legacy.pdf');
});

test('updates preserve education IDs, certificate associations, extra uploads and omitted legacy records', async () => {
  const context = setup([
    { education_id: 4, employee_id: 42, degree: 'MS' },
    { education_id: 5, employee_id: 42, degree: 'Medicine' },
  ], [
    { id: 1, education_id: 4, file_url: '/old.pdf' }, { id: 2, education_id: 4, file_url: '/extra.pdf' },
  ], [{ certification_id: 3, education_id: 4, name: 'Existing cert' }]);
  await persistEducation({ ...context, payload: { educationList: [{ id: 4, educationLevel: 'masters', degree: 'MSc', docFile: { url: '/new.pdf' } }] } });
  expect(context.Education.state.map(row => row.education_id)).toEqual([4, 5]);
  expect(context.Education.state[0]).toMatchObject({ degree: 'MSc', education_level: 'masters' });
  expect(context.Upload.state.map(row => row.file_url)).toEqual(['/new.pdf', '/extra.pdf']);
  expect(context.Certification.state[0].education_id).toBe(4);
  expect(context.Education.state[0].update).toHaveBeenCalledWith(expect.any(Object), { transaction: context.transaction });
});

test('resubmitting temporary IDs reuses fixed levels instead of duplicating them', async () => {
  const context = setup();
  const payload = { educationList: [{ id: 'level-degree', educationLevel: 'degree', degree: 'Diploma' }] };
  await persistEducation({ ...context, payload });
  payload.educationList[0].degree = 'Updated diploma';
  await persistEducation({ ...context, payload });
  expect(context.Education.state).toHaveLength(1);
  expect(context.Education.state[0].degree).toBe('Updated diploma');
});

test('old timestamp drafts remain compatible and repeated submissions are idempotent', async () => {
  const context = setup();
  const payload = { educationList: [{ id: 1780000000000, degree: 'Medicine', university: 'University' }] };
  await persistEducation({ ...context, payload });
  await persistEducation({ ...context, payload });
  expect(context.Education.state).toHaveLength(1);
  expect(context.Education.state[0].degree).toBe('Medicine');
});

test('removing the displayed upload preserves other attachments', async () => {
  const context = setup([{ education_id: 4, employee_id: 42, degree: 'MS' }], [
    { id: 1, education_id: 4, file_url: '/first.pdf' }, { id: 2, education_id: 4, file_url: '/second.pdf' },
  ]);
  await persistEducation({ ...context, payload: { educationList: [{ id: 4, degree: 'MS', docFile: null }] } });
  expect(context.Upload.state.map(row => row.id)).toEqual([2]);
});

test('repeating an explicit upload removal never removes the next saved attachment', async () => {
  const context = setup([{ education_id: 4, employee_id: 42, degree: 'MS' }], [
    { id: 1, education_id: 4, file_url: '/first.pdf' }, { id: 2, education_id: 4, file_url: '/second.pdf' },
  ]);
  const payload = { educationList: [{ id: 4, degree: 'MS', primaryUploadId: 1, docFile: null }] };
  await persistEducation({ ...context, payload });
  await persistEducation({ ...context, payload });
  expect(context.Upload.state.map(row => row.id)).toEqual([2]);
});

test('new uploaded files and certifications are stable across repeated saves', async () => {
  const context = setup();
  const payload = { educationList: [{ id: 'level-masters', educationLevel: 'masters', degree: 'MS', primaryUploadId: null, docFile: { url: '/degree.pdf' } }],
    certList: [{ id: 1780000000000, name: 'Certificate', certFile: { url: '/certificate.pdf' } }] };
  await persistEducation({ ...context, payload });
  await persistEducation({ ...context, payload });
  expect(context.Education.state).toHaveLength(1);
  expect(context.Upload.state).toHaveLength(1);
  expect(context.Certification.state).toHaveLength(1);
});

test('certificate editing and explicit deletion preserve unrelated certificates and their links', async () => {
  const context = setup([{ education_id: 4, employee_id: 42, degree: 'MS' }], [], [
    { certification_id: 1, education_id: 4, name: 'Original' },
    { certification_id: 2, education_id: 4, name: 'Delete' },
    { certification_id: 3, education_id: 4, name: 'Omitted by old draft' },
  ]);
  await persistEducation({ ...context, payload: { certList: [{ id: 1, name: 'Updated' }], deletedCertificationIds: [2] } });
  expect(context.Certification.state.map(row => row.certification_id)).toEqual([1, 3]);
  expect(context.Certification.state[0]).toMatchObject({ name: 'Updated', education_id: 4 });
});

test('foreign employee IDs cannot update their education, uploads or certificates', async () => {
  const context = setup([{ education_id: 9, employee_id: 99, degree: 'Private' }],
    [{ id: 8, education_id: 9, file_url: '/private.pdf' }],
    [{ certification_id: 7, education_id: 9, name: 'Private certificate' }]);
  await persistEducation({ ...context, payload: {
    educationList: [{ id: 9, degree: 'Own degree', educationLevel: 'degree', docFile: { id: 8, url: '/own.pdf' } }],
    certList: [{ id: 7, name: 'Own certificate' }], deletedCertificationIds: [7],
  } });
  expect(context.Education.state[0].degree).toBe('Private');
  expect(context.Upload.state[0].file_url).toBe('/private.pdf');
  expect(context.Certification.state[0].name).toBe('Private certificate');
});

test('unknown education levels fail rather than silently reclassifying records', async () => {
  const context = setup();
  await expect(persistEducation({ ...context, payload: { educationList: [{ educationLevel: 'unknown', degree: 'BA' }] } })).rejects.toThrow('Invalid education level');
});
