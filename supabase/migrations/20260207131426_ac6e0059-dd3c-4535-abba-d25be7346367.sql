
-- Allow DELETE on messages (needed for ticket deletion)
CREATE POLICY "Anyone can delete messages"
ON public.messages
FOR DELETE
USING (true);

-- Allow DELETE on ticket_notes
CREATE POLICY "Staff can delete ticket notes"
ON public.ticket_notes
FOR DELETE
USING (true);

-- Allow DELETE on tickets
CREATE POLICY "Anyone can delete tickets"
ON public.tickets
FOR DELETE
USING (true);
