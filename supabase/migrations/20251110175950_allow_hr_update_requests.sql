-- Allow HR users to update their own asset requests
-- This policy allows HR role users to update requests they created

CREATE POLICY "HR can update own requests"
ON public.asset_requests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'hr') AND 
  requester_id = auth.uid()
);

