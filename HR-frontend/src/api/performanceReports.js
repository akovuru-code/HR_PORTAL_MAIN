import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getMyPerformanceReports = year => api.get('/performance-reports/me', { params: year ? { year } : undefined });
export const uploadMyPerformanceDraft = (reviewType, reviewYear, file) => {
  const data = new FormData();
  data.append('reviewType', reviewType);
  data.append('reviewYear', String(reviewYear));
  data.append('file', file);
  return api.post('/performance-reports/me/submissions/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const submitMyPerformanceReport = reportId => api.post(`/performance-reports/me/submissions/${reportId}/submit`);
export const requestPerformanceReportReplacement = (reportId, reason) => api.post(`/performance-reports/me/submissions/${reportId}/replacement-requests`, { reason });

export const getAdminPerformanceReports = filters => api.get('/performance-reports/admin', { params: filters });

export async function downloadProtectedPerformanceFile(path, fallbackName) {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed.');
  }
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fallbackName || 'Performance Review.docx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export async function getProtectedPerformanceBlob(path) {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Preview failed.');
  }
  return response.blob();
}
