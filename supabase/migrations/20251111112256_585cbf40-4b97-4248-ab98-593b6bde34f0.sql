-- Allow HR to cancel requests via UPDATE with constrained policy
DROP POLICY IF EXISTS "HR can cancel asset requests" ON public.asset_requests;

CREATE POLICY "HR can cancel asset requests"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND status IN ('pending', 'approved')
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'cancelled'
);