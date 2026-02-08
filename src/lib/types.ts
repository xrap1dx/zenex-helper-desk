export interface ChatMessage {
  id: string;
  content: string;
  sender_type: "visitor" | "staff";
  sender_name: string;
  timestamp: string;
}

export interface InternalNote {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

export interface ChatSession {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: "waiting" | "active" | "closed";
  department: string;
  assigned_to: string | null;
  messages: ChatMessage[];
  internal_notes: InternalNote[];
  transfer_history: any[];
  page_url: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  role: "agent" | "admin";
  departments: string[];
  status: string;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  is_oncall: boolean;
  total_chats_handled: number;
  total_rating: number;
  rating_count: number;
  created_at: string;
}
