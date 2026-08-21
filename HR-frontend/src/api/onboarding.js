// Axios API client for Emp_Personal_Details
import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    // withCredentials: true, // Only if using cookies, but we are using localStorage token
});

// Add request interceptor to include token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

export const getSession = () => api.get("/auth/me"); // { id, role }
export const getOnboarding = (employeeId) =>
    api.get(`/onboarding/${employeeId}`);

export const saveOnboarding = (employeeId, tab, payload) =>
    api.post(`/onboarding/${employeeId}`, { tab, payload });

// Sends a full body with top-level keys (tab, payload, spouse, kids, documents)
// If isDraft is true, POST to /onboarding/:employeeId/save-draft
export const saveOnboardingFull = (employeeId, body, isDraft = false) =>
    api.post(isDraft ? `/onboarding/${employeeId}/save-draft` : `/onboarding/${employeeId}`, body);

export const submitOnboarding = (employeeId, tab) =>
    api.post(`/onboarding/${employeeId}/submit`, tab ? { tab } : {});

export const requestEditAccess = (employeeId, reason) =>
    api.post(`/onboarding/${employeeId}/request-edit`, { reason });

export const getEditRequests = (employeeId) =>
    api.get(`/onboarding/${employeeId}/edit-requests`);

export const deleteDocument = (docId) => api.delete(`/documents/${docId}`);

export const presignUpload = (meta) => api.post("/upload/presign", meta);
// meta = { employeeId, docType, fileName, contentType }

// PUT the file to presignedUrl in browser, then call registerDocument
export const registerDocumentLegacy = (payload) => api.post("/documents", payload);
// payload = { onboardingFormId, docType, fileKey, fileUrl, size }

export const requestEditPermission = (employeeId, reason, sectionKey) =>
    api.post(`/onboarding/${employeeId}/request-edit`, { reason, sectionKey });

export const getEditRequestStatus = (employeeId) =>
    api.get(`/onboarding/${employeeId}/edit-request-status`);

// Fetch the latest edit request for a specific section (tab) or all if no sectionKey
export const getLatestEditRequest = (employeeId, sectionKey) =>
    api.get(`/onboarding/${employeeId}/edit-requests`, { params: sectionKey ? { sectionKey } : {} }).then(res => {
        const items = res.data?.requests || [];
        if (!items.length) return null;
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return items[0];
    });

export const getMyProfile = () => api.get('/auth/me');
export const getPayrolls = () => api.get('/payroll');
export const getTimesheetEntries = () => api.get('/timesheet/entries');
export const submitTimesheetEntries = (entries) => api.post('/timesheet/entries/submit', { entries });
export const getDocuments = (employeeId = null) => (
    employeeId ? api.get(`/documents/employee/${employeeId}`) : api.get('/documents')
);
export const registerDocument = (data) => api.post('/documents/register', data);
// data: { name, url, filename, originalName, document_type, fileData }
export const updateMyProfile = (data) => api.patch('/auth/profile', data);
export const changeEmail = (newEmail, password) => api.patch('/auth/email', { newEmail, password });
export const changePassword = (currentPassword, newPassword) => api.patch('/auth/password', { currentPassword, newPassword });

// Fetch draft for a specific tab (or all if no tab)
export const getDraft = (employeeId, tab) =>
    api.get(`/onboarding/${employeeId}/draft`, { params: tab ? { tab } : {} })
        .then(res => res.data?.draft || null)
        .catch(err => {
            if (err.response?.status === 404) return null;
            throw err;
        });