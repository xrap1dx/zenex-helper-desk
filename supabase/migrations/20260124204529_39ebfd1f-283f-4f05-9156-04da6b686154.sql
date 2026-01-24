-- Add is_typing column to tickets table for typing indicator
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS visitor_typing boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS staff_typing boolean NOT NULL DEFAULT false;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS typing_updated_at timestamp with time zone DEFAULT now();