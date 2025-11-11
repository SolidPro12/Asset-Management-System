-- Allow HR to update asset requests they created
CREATE POLICY "HR can update their own requests"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND requester_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND requester_id = auth.uid()
);