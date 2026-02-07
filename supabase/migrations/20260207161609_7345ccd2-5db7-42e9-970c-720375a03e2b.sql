
-- Add 'affiliate' to staff_role enum
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Create affiliate companies table
CREATE TABLE public.affiliate_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL
);

-- Link affiliate members to companies
CREATE TABLE public.affiliate_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.affiliate_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, company_id)
);

-- Affiliate click tracking
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.affiliate_companies(id) ON DELETE CASCADE,
  referrer TEXT,
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new departments
INSERT INTO public.departments (name, description) VALUES
  ('Affiliate Program', 'Department for affiliate program members'),
  ('Affiliate Program Management', 'Department for managing the affiliate program');

-- RLS for affiliate_companies
ALTER TABLE public.affiliate_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active affiliate companies" ON public.affiliate_companies FOR SELECT USING (true);
CREATE POLICY "Staff can manage affiliate companies" ON public.affiliate_companies FOR ALL USING (true);

-- RLS for affiliate_members
ALTER TABLE public.affiliate_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view affiliate members" ON public.affiliate_members FOR SELECT USING (true);
CREATE POLICY "Staff can manage affiliate members" ON public.affiliate_members FOR ALL USING (true);

-- RLS for affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view clicks" ON public.affiliate_clicks FOR SELECT USING (true);

-- Trigger for updated_at on affiliate_companies
CREATE TRIGGER update_affiliate_companies_updated_at
  BEFORE UPDATE ON public.affiliate_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
