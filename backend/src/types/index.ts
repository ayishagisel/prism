// Common types and interfaces

export interface JWTPayload {
  userId: string;
  agencyId: string;
  email: string;
  role: 'AGENCY_ADMIN' | 'AGENCY_MEMBER' | 'CLIENT_USER';
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  userId: string;
  agencyId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Domain-specific types
export interface CreateOpportunityInput {
  title: string;
  summary?: string;
  media_type: string;
  outlet_name?: string;
  opportunity_type: string;
  category_tags?: string[];
  topic_tags?: string[];
  industry_tags?: string[];
  deadline_at?: string;
  visibility?: string;
  target_client_ids?: string[];
}

export interface UpdateClientOpportunityStatusInput {
  response_state: 'interested' | 'accepted' | 'declined';
  decline_reason?: string;
  notes_for_agency?: string;
}

export interface CreateFollowUpTaskInput {
  opportunity_id: string;
  client_id: string;
  title: string;
  description?: string;
  due_at?: string;
  task_type?: string;
  priority?: string;
  assigned_to_user_id?: string;
}
