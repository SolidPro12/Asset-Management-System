-- Update request_history policy to allow HR to insert update action records
DROP POLICY IF EXISTS "Admins and HR can insert request history" ON public.request_history;

CREATE POLICY "Admins and HR can insert request history"
ON public.request_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'hr'::app_role) AND action IN ('cancelled', 'updated', 'created'))
);