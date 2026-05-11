import axios from 'axios';

const API_BASE_URL = 'https://localhost:7077/api';  // thay bằng port backend của bạn (thường 5000 hoặc 7123)

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor: tự động gắn Bearer token nếu có
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor response: xử lý lỗi chung (401 → logout, v.v.)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        if (error.response?.status === 503) {
            const data = error.response.data;
            if (data.maintenanceMode) {
                // Chuyển hướng đến trang bảo trì
                window.location.href = '/maintenance';
            }
        }
        return Promise.reject(error);
    }

);

export default api;