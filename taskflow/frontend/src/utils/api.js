import axios from 'axios';
const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const api = axios.create({ baseURL: API });

api.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(r => r, e => {
  if (e.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
  return Promise.reject(e);
});

export const authAPI = {
  google: d => api.post('/api/auth/google', d),
  me: () => api.get('/api/auth/me'),
};
export const projectsAPI = {
  getAll: () => api.get('/api/projects/'),
  create: d => api.post('/api/projects/', d),
  join: code => api.post('/api/projects/join', { code }),
  update: (id, d) => api.put(`/api/projects/${id}`, d),
  delete: id => api.delete(`/api/projects/${id}`),
  getMembers: id => api.get(`/api/projects/${id}/members`),
  removeMember: (id, userId) => api.delete(`/api/projects/${id}/members/${userId}`),
};
export const tasksAPI = {
  getAll: p => api.get('/api/tasks/', { params: p }),
  create: d => api.post('/api/tasks/', d),
  createBulk: d => api.post('/api/tasks/bulk', d),
  update: (id, d) => api.put(`/api/tasks/${id}`, d),
  delete: id => api.delete(`/api/tasks/${id}`),
  reorder: taskIds => api.post('/api/tasks/reorder', { task_ids: taskIds }),
  assign: (id, code) => api.post(`/api/tasks/${id}/assign`, { invite_code: code }),
  unassign: (id, userId) => api.delete(`/api/tasks/${id}/assign/${userId}`),
  getStats: () => api.get('/api/tasks/stats'),
};
export const aiAPI = {
  generateTasks: d => api.post('/api/ai/generate-tasks', d),
  generateFromFile: (projectName, file) => {
    const fd = new FormData();
    fd.append('project_name', projectName);
    fd.append('file', file);
    return api.post('/api/ai/generate-from-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
export const chatAPI = {
  getMessages: projectId => api.get(`/api/chat/${projectId}`),
  send: (projectId, text) => api.post('/api/chat/', { project_id: projectId, text }),
};
export const notificationsAPI = {
  getAll: () => api.get('/api/notifications/'),
  markRead: id => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
};
export default api;
