-- Create request_history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.asset_requests(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'updated', 'fulfilled')),
  performed_by uuid REFERENCES auth.users(id),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all request history"
  ON public.request_history
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert request history"
  ON public.request_history
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- Create index for better performance
CREATE INDEX idx_request_history_request_id ON public.request_history(request_id);
CREATE INDEX idx_request_history_created_at ON public.request_history(created_at DESC);