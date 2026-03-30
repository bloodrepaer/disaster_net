import { apiClient } from './client';

export interface BundleRecord {
  personId: string;
  rescuerId: string;
  condition: 'RECOVERED' | 'CRITICAL' | 'INJURED' | 'STABLE';
  zone: string;
  location: string;
  notes?: string;
}

export interface BundleData {
  records: BundleRecord[];
  rescueTeamId: string;
  operationZone: string;
}

export interface Bundle {
  id: string;
  bundleId: string;
  records: BundleRecord[];
  status: 'PENDING' | 'ANCHORED' | 'FAILED';
  starknetHash?: string;
  createdAt: string;
  anchoredAt?: string;
}

export const bundleService = {
  /**
   * Submit a new rescue bundle
   */
  submit: async (data: BundleData) => {
    const response = await apiClient.post('/bundles', data);
    return response.data as Bundle;
  },

  /**
   * Get bundle by ID
   */
  getById: async (id: string) => {
    const response = await apiClient.get(`/bundles/${id}`);
    return response.data as Bundle;
  },

  /**
   * Get all bundles for a rescuer
   */
  getByRescuer: async (rescuerId: string) => {
    const response = await apiClient.get('/bundles', {
      params: { rescuerId },
    });
    return response.data as Bundle[];
  },

  /**
   * Get bundle status and polling information
   */
  getStatus: async (id: string) => {
    const response = await apiClient.get(`/bundles/${id}/status`);
    return response.data;
  },

  /**
   * Anchor a bundle on Starknet
   */
  anchor: async (id: string) => {
    const response = await apiClient.post(`/bundles/${id}/anchor`);
    return response.data as Bundle;
  },

  /**
   * Get all pending bundles for anchoring
   */
  getPending: async () => {
    const response = await apiClient.get('/bundles/pending');
    return response.data as Bundle[];
  },

  /**
   * Get recent bundles across the system
   */
  getRecent: async (limit = 10) => {
    const response = await apiClient.get('/bundles/recent', {
      params: { limit },
    });
    return response.data as Bundle[];
  },
};
