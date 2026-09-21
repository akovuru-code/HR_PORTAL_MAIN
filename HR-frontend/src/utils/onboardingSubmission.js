export function isTabSubmitted(value) {
  return value === true || (Boolean(value) && typeof value === 'object' && value.submitted === true);
}

export function isSubmittedByAdmin(value) {
  return isTabSubmitted(value) && value?.submittedBy === 'admin';
}

export function canEditDocuments({ onboardingSubmitted, canEdit, submittedByAdmin }) {
  return !onboardingSubmitted || canEdit || submittedByAdmin;
}
