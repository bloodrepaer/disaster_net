import { apiClient } from './client';
import { MedicalAssessment } from '../../types';

export interface AssessmentData {
  personId: string;
  medicId: string;
  injuryType: string;
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
  clinicalNotes: string;
  recommendedAction: 'DISCHARGE' | 'HOSPITAL' | 'OBSERVATION' | 'EMERGENCY';
  priority?: 'URGENT' | 'MODERATE' | 'MINOR';
}

export interface TriageEntry {
  personId: string;
  name: string;
  age: number;
  gender: string;
  priority: 'URGENT' | 'MODERATE' | 'MINOR';
  arrivalTime: string;
  status: 'WAITING' | 'IN_ASSESSMENT' | 'COMPLETED';
}

export const medicalService = {
  /**
   * Get triage queue
   */
  getTriageQueue: async () => {
    const response = await apiClient.get('/medical/triage-queue');
    return response.data as TriageEntry[];
  },

  /**
   * Submit medical assessment
   */
  submitAssessment: async (data: AssessmentData) => {
    const response = await apiClient.post('/medical/assessments', data);
    return response.data as MedicalAssessment;
  },

  /**
   * Get assessment by person ID
   */
  getAssessmentByPersonId: async (personId: string) => {
    const response = await apiClient.get(`/medical/assessments/person/${personId}`);
    return response.data as MedicalAssessment[];
  },

  /**
   * Get assessment by ID
   */
  getAssessmentById: async (assessmentId: string) => {
    const response = await apiClient.get(`/medical/assessments/${assessmentId}`);
    return response.data as MedicalAssessment;
  },

  /**
   * Issue medical clearance certificate
   */
  issueClearance: async (personId: string, medicId: string) => {
    const response = await apiClient.post('/medical/clearance', {
      personId,
      medicId,
    });
    return response.data;
  },

  /**
   * Get clearance by person ID
   */
  getClearanceByPersonId: async (personId: string) => {
    const response = await apiClient.get(`/medical/clearance/${personId}`);
    return response.data;
  },

  /**
   * Get all clearances issued today
   */
  getTodaysClearances: async () => {
    const response = await apiClient.get('/medical/clearances/today');
    return response.data;
  },

  /**
   * Get patient records
   */
  getPatientRecords: async () => {
    const response = await apiClient.get('/medical/patients');
    return response.data as TriageEntry[];
  },

  /**
   * Get medical statistics
   */
  getStats: async () => {
    const response = await apiClient.get('/medical/stats');
    return response.data as {
      totalPatients: number;
      urgentCount: number;
      moderateCount: number;
      minorCount: number;
      clearancesIssued: number;
    };
  },

  /**
   * Update assessment
   */
  updateAssessment: async (assessmentId: string, data: Partial<AssessmentData>) => {
    const response = await apiClient.patch(`/medical/assessments/${assessmentId}`, data);
    return response.data as MedicalAssessment;
  },
};
