import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 2000,
});

export const healthAPI = {
    check: () => apiClient.get('/api/v1/health/'),
};

export interface HealthResponse {
    status: string;
    message: string;
    dependencies?: Record<string, string>;
}