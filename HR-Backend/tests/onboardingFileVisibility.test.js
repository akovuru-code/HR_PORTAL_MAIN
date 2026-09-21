const { hideAdminUploadedFiles, isAdminUploadedFile } = require('../src/utils/onboardingFileVisibility');

const adminFile = { url: '/admin.pdf', uploadedBy: { role: 'admin' } };
const employeeFile = { url: '/employee.pdf', uploadedBy: { role: 'employee', employeeId: 7 } };

test('identifies admin-uploaded file metadata', () => {
  expect(isAdminUploadedFile(adminFile)).toBe(true);
  expect(isAdminUploadedFile(employeeFile)).toBe(false);
});

test('removes admin-uploaded file references without removing employee files', () => {
  expect(hideAdminUploadedFiles({ passportFile: adminFile, visaFile: employeeFile, kids: [{ i9File: adminFile }] }))
    .toEqual({ passportFile: null, visaFile: employeeFile, kids: [{ i9File: null }] });
});
