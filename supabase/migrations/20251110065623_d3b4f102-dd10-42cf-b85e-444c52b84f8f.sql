-- Create ticket_history table to track all changes
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_history
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history of their own tickets or if they're admin
CREATE POLICY "Users can view relevant ticket history"
ON public.ticket_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Policy: Admins can insert ticket history
CREATE POLICY "Admins can insert ticket history"
ON public.ticket_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND tickets.created_by = auth.uid()
  )
);

-- Create trigger function to log ticket changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status::text,
      NEW.status::text,
      auth.uid(),
      'Ticket status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'assignment_change',
      COALESCE(OLD.assigned_to::text, 'unassigned'),
      COALESCE(NEW.assigned_to::text, 'unassigned'),
      auth.uid(),
      CASE 
        WHEN NEW.assigned_to IS NULL THEN 'Ticket unassigned'
        WHEN OLD.assigned_to IS NULL THEN 'Ticket assigned'
        ELSE 'Ticket reassigned'
      END
    );
  END IF;

  -- Log priority changes
  IF TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'priority_change',
      OLD.priority::text,
      NEW.priority::text,
      auth.uid(),
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;

  -- Log ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      'Ticket created'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for ticket changes
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
CREATE TRIGGER trigger_log_ticket_changes
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_changes();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created_at ON public.ticket_history(created_at DESC);