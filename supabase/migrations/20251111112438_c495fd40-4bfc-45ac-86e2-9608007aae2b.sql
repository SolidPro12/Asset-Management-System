-- Update policy to only allow HR to cancel pending requests (not approved)
DROP POLICY IF EXISTS "HR can cancel asset requests" ON public.asset_requests;

CREATE POLICY "HR can cancel pending requests only"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'pending'
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'cancelled'
);