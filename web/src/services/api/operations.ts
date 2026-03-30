import { apiClient } from './client';

export interface OperationMetrics {
  totalVictims: number;
  totalRescued: number;
  totalDeceased: number;
  totalMissing: number;
  compensationPaid: number;
  activeWorkers: number;
}

export interface BlockchainStatus {
  starknet: {
    status: 'ACTIVE' | 'INACTIVE';
    bundlesAnchored: number;
    lastAnchor?: string;
  };
  ronin: {
    status: 'ACTIVE' | 'INACTIVE';
    compensationProcessed: number;
    lastTransaction?: string;
  };
  networkHealth: number; // percentage
}

export const operationsService = {
  /**
   * Get overall operation metrics
   */
  getMetrics: async () => {
    const response = await apiClient.get('/operations/metrics');
    return response.data as OperationMetrics;
  },

  /**
   * Get blockchain status
   */
  getBlockchainStatus: async () => {
    const response = await apiClient.get('/operations/blockchain-status');
    return response.data as BlockchainStatus;
  },

  /**
   * Get operations by zone
   */
  getZoneMetrics: async () => {
    const response = await apiClient.get('/operations/zones');
    return response.data as Array<{
      zone: string;
      status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
      peopleAssisted: number;
    }>;
  },

  /**
   * Get response time analytics
   */
  getResponseTimeAnalytics: async () => {
    const response = await apiClient.get('/operations/response-time');
    return response.data as {
      averageResponseTime: number;
      rescueSuccessRate: number;
      medicalClearanceTime: number;
    };
  },

  /**
   * Get daily progress data
   */
  getDailyProgress: async (days = 7) => {
    const response = await apiClient.get('/operations/daily-progress', {
      params: { days },
    });
    return response.data as Array<{
      date: string;
      rescued: number;
      compensation: number;
      clearances: number;
    }>;
  },

  /**
   * Get fund management details
   */
  getFundingStatus: async () => {
    const response = await apiClient.get('/operations/funding');
    return response.data as {
      totalFund: number;
      distributed: number;
      remaining: number;
      byCategory: {
        deceased: number;
        critical: number;
        injured: number;
      };
    };
  },

  /**
   * Get volunteer statistics
   */
  getVolunteerStats: async () => {
    const response = await apiClient.get('/operations/volunteers');
    return response.data as {
      pending: number;
      verified: number;
      rejected: number;
    };
  },

  /**
   * Get recent audit logs
   */
  getAuditLogs: async (limit = 20) => {
    const response = await apiClient.get('/operations/audit-logs', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Approve volunteer
   */
  approveVolunteer: async (volunteerId: string) => {
    const response = await apiClient.post(`/operations/volunteers/${volunteerId}/approve`);
    return response.data;
  },

  /**
   * Reject volunteer
   */
  rejectVolunteer: async (volunteerId: string, reason: string) => {
    const response = await apiClient.post(`/operations/volunteers/${volunteerId}/reject`, {
      reason,
    });
    return response.data;
  },

  /**
   * Get pending volunteer applications
   */
  getPendingVolunteers: async () => {
    const response = await apiClient.get('/operations/volunteers/pending');
    return response.data;
  },
};
