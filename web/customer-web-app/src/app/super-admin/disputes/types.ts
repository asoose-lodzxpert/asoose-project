export interface Dispute {
  id: string;
  status: string;
  priority: string;
  category: string;
  parties: string;
  relatedType: string;
  relatedAmount: string;
  reportedBy: string;
  reportedAt: string;
  messageCount: number;
  isUrgent: boolean;
  hoursOpen: number;
  breachedSLA: boolean;
}

export interface DisputeStats {
  totalOpen: number;
  totalResolved: number;
  totalRejected: number;
  urgentOpen: number;
  breachedSLA: number;
  resolutionRate: number;
}
