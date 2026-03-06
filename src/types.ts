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

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  sequence: number;
  created_at: string;
}

export interface Resource {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  city?: string | null;
  address: string;
  phone: string | null;
  email?: string | null;
  website: string | null;
  hours?: string | null;
  provides?: string | null;
  remarks?: string | null;
  details?: string | null;
  status: ResourceStatus;
  created_at: string;
  updated_at?: string;
  // Aggregate fields
  average_rating?: number;
  review_count?: number;
  ranking_score?: number;
}

export interface Feedback {
  id: string;
  resource_id: string;
  guest_name: string | null;
  guest_email: string | null;
  rating_overall: number;
  rating_accessibility?: number;
  rating_staff?: number;
  rating_usefulness?: number;
  review_text: string | null;
  wait_time_notes?: string | null;
  hours_accuracy_notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderation_notes?: string | null;
  moderated_by?: string | null;
  moderated_at?: string | null;
  created_at: string;
  updated_at: string;
  resource?: Resource;
}

export interface SearchAnalytics {
  id: string;
  raw_prompt: string;
  extracted_needs_json: any;
  inferred_location: string | null;
  inferred_urgency: string | null;
  inferred_need_types: string[] | null;
  results_count: number;
  matched_resource_ids: string[] | null;
  search_success: boolean;
  created_at: string;
  session_id: string | null;
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

export interface ErrorEvent {
  id: string;
  created_at: string;
  source: 'client' | 'api' | 'job';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  stack: string | null;
  route: string | null;
  endpoint: string | null;
  user_id: string | null;
  session_id: string | null;
  metadata: any;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
}
