-- Create junction table for staff to departments (many-to-many)
CREATE TABLE public.staff_departments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(staff_id, department_id)
);

-- Enable RLS
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;

-- Policies - only via service role (edge function)
CREATE POLICY "Staff departments via service role only"
    ON public.staff_departments FOR ALL
    USING (false)
    WITH CHECK (false);

-- Create a public view for staff departments that's safe to query
CREATE VIEW public.staff_departments_public
WITH (security_invoker = on) AS
SELECT sd.id, sd.staff_id, sd.department_id, d.name as department_name
FROM public.staff_departments sd
JOIN public.departments d ON d.id = sd.department_id;

-- Migrate existing department_id data to junction table
INSERT INTO public.staff_departments (staff_id, department_id)
SELECT id, department_id FROM public.staff WHERE department_id IS NOT NULL;

-- Add list managers function for transfers
CREATE OR REPLACE FUNCTION public.list_managers()
RETURNS TABLE(id uuid, display_name text, is_online boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.display_name, s.is_online
  FROM public.staff s
  WHERE s.role = 'manager'
$$;