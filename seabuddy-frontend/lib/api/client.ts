import axios from 'axios';
import { API_CONFIG } from './config';
import type { SyncRequest, SyncResponse, Resource } from '../types';

const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const api = {
  // Health check
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Sync endpoint - core of offline-first
  sync: async (request: SyncRequest): Promise<SyncResponse> => {
    const response = await apiClient.post('/sync', request);
    return response.data;
  },

  // Resources (read-only)
  getResources: async (params?: { category?: string; type?: string }) => {
    const response = await apiClient.get<{ success: boolean; data: Resource[] }>('/resources', { params });
    return response.data.data;
  },

  // Mood logs (for real-time posting if online)
  postMoodLog: async (data: any) => {
    const response = await apiClient.post('/moods', data);
    return response.data;
  },

  // Journal entries (for real-time posting if online)
  postJournalEntry: async (data: any) => {
    const response = await apiClient.post('/journal', data);
    return response.data;
  },
};

export default apiClient;
