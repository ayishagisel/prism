export interface User {
  id: string;
  email: string;
  agencyId: string;
  role: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  primary_contact_email: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  agency_id: string;
  title: string;
  summary?: string;
  media_type: string;
  outlet_name?: string;
  opportunity_type: string;
  category_tags: string[];
  deadline_at?: string;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  industry?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ClientOpportunityStatus {
  id: string;
  client_id: string;
  opportunity_id: string;
  response_state: 'pending' | 'interested' | 'accepted' | 'declined' | 'no_response';
  responded_at?: string;
  decline_reason?: string;
  notes_for_agency?: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpTask {
  id: string;
  agency_id: string;
  opportunity_id: string;
  client_id: string;
  title: string;
  description?: string;
  due_at?: string;
  status: string;
  task_type?: string;
  priority: string;
  created_at: string;
  updated_at: string;
}
