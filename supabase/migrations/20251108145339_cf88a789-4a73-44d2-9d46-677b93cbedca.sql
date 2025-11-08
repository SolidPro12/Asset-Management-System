-- Create ticket_priority enum
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create issue_category enum
CREATE TYPE public.issue_category AS ENUM ('hardware', 'software', 'network', 'access');

-- Create tickets table
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text NOT NULL UNIQUE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_name text NOT NULL,
  location text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  issue_category issue_category NOT NULL,
  department text NOT NULL,
  attachments text,
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tickets table
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create function to generate ticket ID
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF last_id IS NULL THEN
    RETURN 'TKT001';
  END IF;
  
  next_num := CAST(SUBSTRING(last_id FROM 4) AS integer) + 1;
  new_id := 'TKT' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger function to set ticket_id
CREATE OR REPLACE FUNCTION public.set_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_id IS NULL THEN
    NEW.ticket_id := generate_ticket_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for ticket_id
CREATE TRIGGER trigger_set_ticket_id
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_id();

-- Create trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update all tickets"
ON public.tickets
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));