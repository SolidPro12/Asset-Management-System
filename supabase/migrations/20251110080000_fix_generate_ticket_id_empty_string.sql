-- Fix generate_ticket_id function to filter out empty strings
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
  -- Get the last ticket_id, filtering out NULL and empty strings
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL 
    AND ticket_id != ''
    AND LENGTH(TRIM(ticket_id)) > 0
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no valid records exist, start with TKT-001
  IF last_id IS NULL OR last_id = '' OR LENGTH(TRIM(last_id)) = 0 THEN
    RETURN 'TKT-001';
  END IF;
  
  -- Extract the number part after 'TKT-' or 'TKT' and increment
  -- Support both formats: TKT-001 and TKT001
  IF last_id LIKE 'TKT-%' THEN
    -- Format with hyphen: TKT-001
    next_num := CAST(SUBSTRING(last_id FROM 5) AS integer) + 1;
    new_id := 'TKT-' || LPAD(next_num::text, 3, '0');
  ELSIF last_id LIKE 'TKT%' THEN
    -- Format without hyphen: TKT001
    next_num := CAST(SUBSTRING(last_id FROM 4) AS integer) + 1;
    new_id := 'TKT' || LPAD(next_num::text, 3, '0');
  ELSE
    -- Default fallback
    RETURN 'TKT-001';
  END IF;
  
  RETURN new_id;
END;
$function$;

