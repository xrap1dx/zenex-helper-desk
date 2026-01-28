-- Create internal notes table for ticket events/notes
CREATE TABLE public.ticket_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL DEFAULT 'note', -- 'note', 'transfer', 'refer', 'status_change', 'assigned'
  content TEXT NOT NULL,
  metadata JSONB, -- Store additional info like target_department, target_staff, old_status, new_status
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;

-- Policies - staff can manage notes
CREATE POLICY "Staff can view ticket notes"
ON public.ticket_notes
FOR SELECT
USING (true);

CREATE POLICY "Staff can create ticket notes"
ON public.ticket_notes
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_ticket_notes_ticket_id ON public.ticket_notes(ticket_id);
CREATE INDEX idx_ticket_notes_created_at ON public.ticket_notes(created_at);

-- Enable realtime for ticket_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_notes;