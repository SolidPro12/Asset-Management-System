-- Drop existing HR update policy and create a new one that allows HR to edit any request created by HR
DROP POLICY IF EXISTS "HR can update their own requests" ON public.asset_requests;

CREATE POLICY "HR can update requests created by HR"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = asset_requests.requester_id 
    AND role = 'hr'::app_role
  ) AND
  status = 'pending'
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role)
);