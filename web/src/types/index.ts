export type UserRole = 'VICTIM' | 'RESCUER' | 'MEDIC' | 'ORG';

export interface User {
  id: string;
  nearId: string;
  email: string;
  role: UserRole;
  zone?: string;
  organization?: string;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  status: 'Missing' | 'Found' | 'Deceased' | 'Unknown';
  zone: string;
  reportedBy: string;
  reportedAt: Date;
  lastSeen?: string;
  description?: string;
  photo?: string;
  confirmations: Confirmation[];
  compensation?: Compensation;
}

export interface Confirmation {
  id: string;
  personId: string;
  actorId: string;
  actorRole: string;
  txHash: string;
  confirmedAt: Date;
}

export interface Compensation {
  id: string;
  personId: string;
  amount: number;
  status: 'Pending' | 'Unlocked' | 'Claimed';
  roninTxHash?: string;
  unlockedAt?: Date;
  claimedAt?: Date;
  claimedBy?: string;
}

export interface MedicalAssessment {
  id: string;
  personId: string;
  assessor: string;
  severity: 'CRITICAL' | 'MODERATE' | 'MINOR';
  injuries: string[];
  clearance: boolean;
  notes: string;
  timestamp: Date;
}

export interface Bundle {
  id: string;
  nodeId: string;
  headHash: string;
  eventCount: number;
  status: 'queued' | 'submitted' | 'anchored' | 'failed';
  txHash?: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}
