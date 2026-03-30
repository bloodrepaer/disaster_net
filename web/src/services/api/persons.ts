import { apiClient } from './client';
import { Person } from '../../types';

interface SearchParams {
  name?: string;
  phone?: string;
  zone?: string;
  status?: 'MISSING' | 'FOUND' | 'DECEASED';
}

interface CreatePersonData {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  zone: string;
  description?: string;
}

export const personService = {
  /**
   * Search for persons by criteria
   */
  search: async (params: SearchParams) => {
    const response = await apiClient.get('/persons/search', {
      params,
    });
    return response.data as Person[];
  },

  /**
   * Get a single person by ID
   */
  getById: async (id: string) => {
    const response = await apiClient.get(`/persons/${id}`);
    return response.data as Person;
  },

  /**
   * Create a new person record
   */
  create: async (data: CreatePersonData) => {
    const response = await apiClient.post('/persons', data);
    return response.data as Person;
  },

  /**
   * Update person status
   */
  updateStatus: async (id: string, status: 'MISSING' | 'FOUND' | 'DECEASED') => {
    const response = await apiClient.patch(`/persons/${id}/status`, { status });
    return response.data as Person;
  },

  /**
   * Add confirmation for a person (rescuer reports finding someone)
   */
  addConfirmation: async (id: string, rescuerId: string, notes: string) => {
    const response = await apiClient.post(`/persons/${id}/confirmations`, {
      rescuerId,
      notes,
    });
    return response.data;
  },

  /**
   * Get person's family members
   */
  getFamilyMembers: async (id: string) => {
    const response = await apiClient.get(`/persons/${id}/family`);
    return response.data as Person[];
  },

  /**
   * Get person's timeline (all updates and confirmations)
   */
  getTimeline: async (id: string) => {
    const response = await apiClient.get(`/persons/${id}/timeline`);
    return response.data;
  },
};
