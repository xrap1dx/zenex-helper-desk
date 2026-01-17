-- Create enum for staff roles
CREATE TYPE public.staff_role AS ENUM ('admin', 'manager', 'associate');

-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');

-- Create departments table
CREATE TABLE public.departments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table (not linked to auth.users since staff use custom login)
CREATE TABLE public.staff (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role staff_role NOT NULL DEFAULT 'associate',
    department_id UUID REFERENCES public.departments(id),
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.staff(id)
);

-- Create tickets table
CREATE TABLE public.tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    subject TEXT,
    status ticket_status NOT NULL DEFAULT 'open',
    department_id UUID REFERENCES public.departments(id),
    assigned_to UUID REFERENCES public.staff(id),
    referred_to UUID REFERENCES public.staff(id),
    session_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'staff')),
    sender_id UUID REFERENCES public.staff(id),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Departments policies (public read for visitors)
CREATE POLICY "Anyone can view departments"
    ON public.departments FOR SELECT
    USING (true);

CREATE POLICY "Staff can manage departments"
    ON public.departments FOR ALL
    USING (true);

-- Staff policies (allow all for now since auth is handled in app)
CREATE POLICY "Allow all staff operations"
    ON public.staff FOR ALL
    USING (true);

-- Tickets policies
CREATE POLICY "Anyone can create tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view tickets"
    ON public.tickets FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update tickets"
    ON public.tickets FOR UPDATE
    USING (true);

-- Messages policies
CREATE POLICY "Anyone can create messages"
    ON public.messages FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
    ON public.messages FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update messages"
    ON public.messages FOR UPDATE
    USING (true);

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
    ('Customer Support', 'General customer inquiries and assistance'),
    ('Appeals Team', 'Handle user appeals and disputes'),
    ('Legal & Compliance Team', 'Legal matters and compliance issues'),
    ('Client Relations Team', 'VIP client management and relations');

-- Insert admin user (Rapid with password 123 - hashed)
INSERT INTO public.staff (username, password_hash, display_name, role)
VALUES ('Rapid', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.aOe/aOcBT1fGJHYKDS', 'Rapid', 'admin');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for tickets
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();