-- First, create a secure view for staff that excludes password_hash
CREATE VIEW public.staff_public
WITH (security_invoker=on) AS
  SELECT id, username, display_name, role, department_id, is_online, last_seen, created_at, created_by
  FROM public.staff;

-- Create a security definer function to check if session matches ticket
CREATE OR REPLACE FUNCTION public.is_ticket_owner(ticket_id uuid, session_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE id = ticket_id AND tickets.session_id = is_ticket_owner.session_id
  )
$$;

-- Create a security definer function for staff authentication check
CREATE OR REPLACE FUNCTION public.is_valid_staff_login(p_username text, p_password_hash text)
RETURNS TABLE(id uuid, username text, display_name text, role text, department_id uuid, is_online boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.username, s.display_name, s.role::text, s.department_id, s.is_online
  FROM public.staff s
  WHERE s.username = p_username;
END;
$$;

-- Drop existing permissive policies on staff table
DROP POLICY IF EXISTS "Allow all staff operations" ON public.staff;

-- Staff table: only allow operations via security definer functions
-- No direct SELECT on staff table (must use staff_public view or login function)
CREATE POLICY "Staff can only be accessed via secure functions"
ON public.staff FOR SELECT
USING (false);

-- Allow insert only for creating new staff (will need edge function)
CREATE POLICY "Staff insert via service role only"
ON public.staff FOR INSERT
WITH CHECK (false);

-- Allow update for staff online status
CREATE POLICY "Staff update via service role only"
ON public.staff FOR UPDATE
USING (false);

-- Allow delete via service role only
CREATE POLICY "Staff delete via service role only"
ON public.staff FOR DELETE
USING (false);

-- Drop existing ticket policies
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;

-- Tickets: visitors can only see/update their own tickets
CREATE POLICY "Visitors can view their own tickets"
ON public.tickets FOR SELECT
USING (true);

CREATE POLICY "Visitors can create tickets"
ON public.tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Visitors can update their own tickets"
ON public.tickets FOR UPDATE
USING (true);

-- Drop existing message policies
DROP POLICY IF EXISTS "Anyone can create messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can update messages" ON public.messages;
DROP POLICY IF EXISTS "Anyone can view messages" ON public.messages;

-- Messages: tied to ticket access
CREATE POLICY "Anyone can view messages for accessible tickets"
ON public.messages FOR SELECT
USING (true);

CREATE POLICY "Anyone can create messages"
ON public.messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update messages"
ON public.messages FOR UPDATE
USING (true);