-- Update generate_ticket_id function to return correct format with hyphen
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  -- Get the last ticket_id
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no records exist, start with TKT-001
  IF last_id IS NULL THEN
    RETURN 'TKT-001';
  END IF;
  
  -- Extract the number part after 'TKT-' and increment
  next_num := CAST(SUBSTRING(last_id FROM 5) AS integer) + 1;
  
  -- Format with leading zeros: TKT-001, TKT-002, etc.
  new_id := 'TKT-' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$function$;