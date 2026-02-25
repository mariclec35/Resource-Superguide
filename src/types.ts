export type RecoveryStage = 'crisis' | 'stabilizing' | 'growth';

export type TransitAccessibility = 
  | 'On Major Bus Line' 
  | 'Near Light Rail (Green Line / Blue Line)' 
  | 'Multiple Transit Options' 
  | 'Limited Transit Access' 
  | 'Car Recommended';

export type Walkability = 
  | 'Walkable ≤ 15 minutes' 
  | 'Walkable 16–30 minutes' 
  | 'Unknown';

export type ResourceStatus = 'active' | 'needs_verification' | 'temporarily_closed';

export interface Resource {
  id: string;
  name: string;
  category: string;
  city_direction: string;
  recovery_stage: RecoveryStage[];
  transit_accessibility: TransitAccessibility;
  walkability: Walkability;
  access_indicators: string[];
  snap_accepted: 'Yes' | 'No' | 'N/A';
  cost: string;
  address: string;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  best_for: string | null;
  status: ResourceStatus;
  last_verified_date: string | null;
  verification_notes: string | null;
  open_report_count: number;
  created_at: string;
}

export type ReportStatus = 'open' | 'in_review' | 'resolved' | 'duplicate';

export interface Report {
  id: string;
  resource_id: string;
  issue_type: string;
  comment: string | null;
  submitted_at: string;
  optional_contact: string | null;
  report_status: ReportStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  admin_user: string | null;
  resource?: Resource;
}
