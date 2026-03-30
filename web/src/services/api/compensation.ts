import { apiClient } from './client';
import { Compensation } from '../../types';

export interface CompensationClaimData {
  personId: string;
  victimEmail: string;
  reason: 'DECEASED' | 'CRITICAL' | 'INJURED';
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
}

export interface OTPVerificationData {
  claimId: string;
  otp: string;
  nearWalletId?: string;
}

export const compensationService = {
  /**
   * Request OTP for compensation claim
   */
  requestOTP: async (personId: string, email: string) => {
    const response = await apiClient.post('/compensation/request-otp', {
      personId,
      email,
    });
    return response.data as { claimId: string; nextRetry?: number };
  },

  /**
   * Verify OTP and initiate compensation claim
   */
  verifyOTP: async (data: OTPVerificationData) => {
    const response = await apiClient.post('/compensation/verify-otp', data);
    return response.data as Compensation;
  },

  /**
   * Get compensation status for a person
   */
  getStatus: async (personId: string) => {
    const response = await apiClient.get(`/compensation/status/${personId}`);
    return response.data as Compensation[];
  },

  /**
   * Get all active/pending claims
   */
  getActiveClaims: async () => {
    const response = await apiClient.get('/compensation/active');
    return response.data as Compensation[];
  },

  /**
   * Get claim details
   */
  getClaimDetails: async (claimId: string) => {
    const response = await apiClient.get(`/compensation/claims/${claimId}`);
    return response.data as Compensation;
  },

  /**
   * Update bank account information for a claim
   */
  updateBankAccount: async (
    claimId: string,
    bankAccount: {
      accountNumber: string;
      bankName: string;
      accountHolder: string;
    }
  ) => {
    const response = await apiClient.patch(`/compensation/claims/${claimId}/bank`, {
      bankAccount,
    });
    return response.data as Compensation;
  },

  /**
   * Get compensation history for a person
   */
  getHistory: async (personId: string) => {
    const response = await apiClient.get(`/compensation/history/${personId}`);
    return response.data;
  },

  /**
   * Get system-wide compensation statistics
   */
  getStats: async () => {
    const response = await apiClient.get('/compensation/stats');
    return response.data as {
      totalDistributed: number;
      totalClaims: number;
      averageAmount: number;
      pendingClaims: number;
    };
  },

  /**
   * Approve compensation claim (admin/org role)
   */
  approveClaim: async (claimId: string) => {
    const response = await apiClient.patch(`/compensation/claims/${claimId}/approve`);
    return response.data as Compensation;
  },

  /**
   * Get transactions on Ronin blockchain
   */
  getRoninTransactions: async () => {
    const response = await apiClient.get('/compensation/ronin/transactions');
    return response.data;
  },
};
