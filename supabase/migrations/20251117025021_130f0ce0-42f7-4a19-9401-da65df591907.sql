-- Create email notification settings table
CREATE TABLE IF NOT EXISTS public.email_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_template TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email digest preferences table
CREATE TABLE IF NOT EXISTS public.email_digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  frequency TEXT NOT NULL DEFAULT 'daily',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_digest_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_notification_settings
CREATE POLICY "Super admins can manage notification settings"
  ON public.email_notification_settings
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view notification settings"
  ON public.email_notification_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for email_templates
CREATE POLICY "Super admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "All authenticated users can view email templates"
  ON public.email_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for email_logs
CREATE POLICY "Admins can view all email logs"
  ON public.email_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert email logs"
  ON public.email_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update email logs"
  ON public.email_logs
  FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- RLS Policies for email_digest_preferences
CREATE POLICY "Users can manage their own digest preferences"
  ON public.email_digest_preferences
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all digest preferences"
  ON public.email_digest_preferences
  FOR SELECT
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- Insert default notification settings
INSERT INTO public.email_notification_settings (notification_type, enabled, description) VALUES
  ('welcome_email', true, 'Welcome email sent to new users'),
  ('asset_assignment', true, 'Email sent when assets are assigned to employees'),
  ('transfer_approval', true, 'Email sent when asset transfer requires approval'),
  ('maintenance_reminder', true, 'Email sent for maintenance schedule reminders'),
  ('ticket_assignment', true, 'Email sent when tickets are assigned'),
  ('email_digest', true, 'Daily/weekly digest emails for administrators')
ON CONFLICT (notification_type) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_notification_type ON public.email_logs(notification_type);

-- Create trigger for updated_at
CREATE TRIGGER update_email_notification_settings_updated_at
  BEFORE UPDATE ON public.email_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_email_digest_preferences_updated_at
  BEFORE UPDATE ON public.email_digest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();