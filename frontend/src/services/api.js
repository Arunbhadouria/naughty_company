import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Required for cookie-based auth
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const analyzerService = {
  analyze: async (query) => {
    const response = await api.post('/analyze', { query });
    return response.data;
  },
  getScanById: async (id) => {
    const response = await api.get(`/analyze/${id}`);
    return response.data;
  },
};

export const authService = {
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  logout: async () => {
    const response = await api.get('/auth/logout');
    return response.data;
  },
};

export default api;
