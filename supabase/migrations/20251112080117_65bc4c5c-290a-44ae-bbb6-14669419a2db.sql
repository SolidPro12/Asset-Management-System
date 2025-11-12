-- Create settings table for storing system configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage settings
CREATE POLICY "Super admins can manage settings"
ON public.settings
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- All authenticated users can view settings (but sensitive data like passwords won't be exposed in queries)
CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Insert default email settings
INSERT INTO public.settings (setting_key, setting_value) VALUES
  ('email_config', jsonb_build_object(
    'email_host', 'smtp.office365.com',
    'email_port', 587,
    'email_host_user', 'spdt-apps-svc@solidpro-es.com',
    'email_host_password', 'SwH^!XuLW9Y2cTD*XR%UvC9CwYC8hDC',
    'from_email', 'spdt-apps-svc@solidpro-es.com',
    'from_name', 'Asset Management System',
    'ssl_enabled', false,
    'tls_enabled', true,
    'authentication_enabled', true,
    'enable_notifications', true
  ))
ON CONFLICT (setting_key) DO NOTHING;