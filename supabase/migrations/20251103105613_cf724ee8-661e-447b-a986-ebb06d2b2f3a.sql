-- Update get_user_role function to include financer in priority order
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'financer' THEN 3
      WHEN role = 'hr' THEN 4
      ELSE 5
    END
  LIMIT 1
$$;

-- Add RLS policy for financer role to update asset financial data
CREATE POLICY "Financers can update asset pricing"
ON public.assets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'financer')
);