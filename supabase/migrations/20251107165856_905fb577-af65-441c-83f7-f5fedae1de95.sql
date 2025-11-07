-- Add request_id column to asset_requests table
ALTER TABLE public.asset_requests ADD COLUMN request_id text;

-- Add is_department_head to profiles table
ALTER TABLE public.profiles ADD COLUMN is_department_head boolean DEFAULT false;

-- Create function to generate next request ID
CREATE OR REPLACE FUNCTION public.generate_request_id()
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
  -- Get the last request_id
  SELECT request_id INTO last_id
  FROM public.asset_requests
  WHERE request_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no records exist, start with AR001
  IF last_id IS NULL THEN
    RETURN 'AR001';
  END IF;
  
  -- Extract the number part and increment
  next_num := CAST(SUBSTRING(last_id FROM 3) AS integer) + 1;
  
  -- Format with leading zeros
  new_id := 'AR' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger to auto-generate request_id
CREATE OR REPLACE FUNCTION public.set_request_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_id IS NULL THEN
    NEW.request_id := generate_request_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_request_id
BEFORE INSERT ON public.asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_request_id();