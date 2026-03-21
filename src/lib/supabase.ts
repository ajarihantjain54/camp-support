import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishable) {
  throw new Error(
    'Missing Supabase env vars. Make sure VITE_SUPABASE_URL and ' +
    'VITE_SUPABASE_PUBLISHABLE_KEY are set in .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishable);

// ─── TypeScript types matching DB schema ──────────────────────────────────────
export interface StaffRow {
  id: number;
  name: string;
  pin_access: string;
  contact_number: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface TicketRow {
  id: number;
  issue_description: string;
  location: string;
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'critical';
  creator_pin: string;
  assigned_to: string | null;
  created_at: string;
}
