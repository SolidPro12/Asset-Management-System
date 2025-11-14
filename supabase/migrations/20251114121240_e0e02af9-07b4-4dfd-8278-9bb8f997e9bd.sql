-- Add soft delete column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id);

-- Create user management log table
CREATE TABLE IF NOT EXISTS public.user_management_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  details text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_management_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view management log"
  ON public.user_management_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "System can insert management log"
  ON public.user_management_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create permission history table
CREATE TABLE IF NOT EXISTS public.permission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  old_role text,
  new_role text,
  old_department text,
  new_department text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.permission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view permission history"
  ON public.permission_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "System can insert permission history"
  ON public.permission_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create ticket comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tickets"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can insert comments on their tickets"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_management_log_target ON public.user_management_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_user ON public.permission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- Add trigger for updated_at on ticket_comments
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();