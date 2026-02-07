import { createClient } from '@supabase/supabase-js';

// User's own Supabase instance
const USER_SUPABASE_URL = 'https://pvibeoojrckylptavvkb.supabase.co';
const USER_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2aWJlb29qcmNreWxwdGF2dmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzY1MzMsImV4cCI6MjA4MzgxMjUzM30.-5xkE7gdvjl5oHp0OyiF1lZaWtDYPi-W4J-hApIaXYE';

export const userSupabase = createClient(USER_SUPABASE_URL, USER_SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
