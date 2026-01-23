export enum VerificationEntityType {
  VENDOR = 'vendor',
  RIDER = 'rider'
}

export type VerificationAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

export interface VerificationDocument {
  id: string;
  type: string;
  url: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

export interface VerificationRow {
  id: string;
  name: string;
  email: string;
  type: VerificationEntityType;
  status: 'PENDING' | 'REJECTED' | 'REQUESTED';
  submittedAt: string;
  documents: VerificationDocument[];
}