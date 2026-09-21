import assert from 'node:assert/strict';
import test from 'node:test';
import { canEditDocuments, isSubmittedByAdmin, isTabSubmitted } from '../src/utils/onboardingSubmission.js';

test('recognizes both legacy and attributed submission records', () => {
  assert.equal(isTabSubmitted(true), true);
  assert.equal(isTabSubmitted({ submitted: true, submittedBy: 'employee' }), true);
  assert.equal(isTabSubmitted({ submitted: false }), false);
  assert.equal(isSubmittedByAdmin({ submitted: true, submittedBy: 'admin' }), true);
  assert.equal(isSubmittedByAdmin(true), false);
});

test('keeps uploads available after admin submission and locks employee submissions', () => {
  assert.equal(canEditDocuments({ onboardingSubmitted: true, canEdit: false, submittedByAdmin: true }), true);
  assert.equal(canEditDocuments({ onboardingSubmitted: true, canEdit: false, submittedByAdmin: false }), false);
  assert.equal(canEditDocuments({ onboardingSubmitted: true, canEdit: true, submittedByAdmin: false }), true);
  assert.equal(canEditDocuments({ onboardingSubmitted: false, canEdit: false, submittedByAdmin: false }), true);
});
