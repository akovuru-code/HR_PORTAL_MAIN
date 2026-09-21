function currentUserIsRoot() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return String(user.account_type || user.accountType || user.role || '').toLowerCase() === 'root_admin';
  } catch { return false; }
}

function authHeaders() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function requestOrUseAdminAction({ actionType, resourceType, resourceId, resourceLabel, isRootAdmin = currentUserIsRoot() }) {
  if (isRootAdmin) return true;
  const token = localStorage.getItem('token');
  const stateResponse = await fetch(`/api/admin-action-requests/mine?actionType=${encodeURIComponent(actionType)}&resourceType=${encodeURIComponent(resourceType)}&resourceIds=${encodeURIComponent(String(resourceId))}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const state = await stateResponse.json().catch(() => ({}));
  const existing = (state.requests || []).find(item => String(item.resourceId) === String(resourceId));
  if (existing?.status === 'approved') return true;
  if (existing?.status === 'pending') {
    window.alert(`${actionType === 'edit' ? 'Edit' : 'Delete'} request is pending Root Admin approval.`);
    return false;
  }

  const reason = window.prompt(`Why should "${resourceLabel}" be ${actionType === 'edit' ? 'edited' : 'deleted'}? This request will be sent to Root Admin.`);
  if (reason === null) return false;
  if (!reason.trim()) {
    window.alert('A deletion reason is required.');
    return false;
  }

  const response = await fetch('/api/admin-action-requests', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ actionType, resourceType, resourceId: String(resourceId), resourceLabel, reason: reason.trim() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to submit the delete request.');
  window.alert(`${actionType === 'edit' ? 'Edit' : 'Delete'} request sent to Root Admin for approval.`);
  return false;
}

export async function requestDeleteApproval({ resourceType, resourceId, resourceLabel }) {
  return requestOrUseAdminAction({ actionType: 'delete', resourceType, resourceId, resourceLabel });
}

export async function confirmOrRequestDelete({ isRootAdmin, resourceType, resourceId, resourceLabel }) {
  if (isRootAdmin === undefined) isRootAdmin = currentUserIsRoot();
  if (isRootAdmin) return window.confirm(`Delete ${resourceLabel}? This cannot be undone.`);
  return requestDeleteApproval({ resourceType, resourceId, resourceLabel });
}
