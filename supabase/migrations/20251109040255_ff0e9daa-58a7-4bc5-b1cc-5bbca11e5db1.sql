-- Create enum for activity types
CREATE TYPE public.activity_type AS ENUM (
  'login',
  'logout',
  'ticket_created',
  'ticket_updated',
  'asset_viewed',
  'asset_assigned',
  'asset_returned',
  'asset_status_changed',
  'asset_location_changed',
  'profile_updated',
  'service_added',
  'request_created',
  'request_updated'
);

-- Create user activity log table
CREATE TABLE public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity
CREATE POLICY "Users can view own activity"
ON public.user_activity_log
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity"
ON public.user_activity_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_user_activity_log_entity ON public.user_activity_log(entity_type, entity_id);

-- Create comprehensive asset activity log
CREATE TABLE public.asset_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  old_value TEXT,
  new_value TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_activity_log ENABLE ROW LEVEL SECURITY;

-- Everyone can view asset activity
CREATE POLICY "Users can view all asset activity"
ON public.asset_activity_log
FOR SELECT
USING (true);

-- Admins can insert asset activity
CREATE POLICY "Admins can insert asset activity"
ON public.asset_activity_log
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Create index for performance
CREATE INDEX idx_asset_activity_log_asset_id ON public.asset_activity_log(asset_id, created_at DESC);

-- Function to log asset activity
CREATE OR REPLACE FUNCTION public.log_asset_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.asset_activity_log (
      asset_id,
      activity_type,
      description,
      performed_by,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'status_change',
      'Asset status changed from ' || OLD.status || ' to ' || NEW.status,
      auth.uid(),
      OLD.status::text,
      NEW.status::text
    );
  END IF;

  -- Log location changes
  IF TG_OP = 'UPDATE' AND OLD.location IS DISTINCT FROM NEW.location THEN
    INSERT INTO public.asset_activity_log (
      asset_id,
      activity_type,
      description,
      performed_by,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      'location_change',
      'Asset location changed from ' || COALESCE(OLD.location, 'N/A') || ' to ' || COALESCE(NEW.location, 'N/A'),
      auth.uid(),
      OLD.location,
      NEW.location
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.current_assignee_id IS DISTINCT FROM NEW.current_assignee_id THEN
    INSERT INTO public.asset_activity_log (
      asset_id,
      activity_type,
      description,
      performed_by,
      metadata
    ) VALUES (
      NEW.id,
      'assignment_change',
      CASE 
        WHEN NEW.current_assignee_id IS NULL THEN 'Asset returned'
        WHEN OLD.current_assignee_id IS NULL THEN 'Asset assigned'
        ELSE 'Asset reassigned'
      END,
      auth.uid(),
      jsonb_build_object(
        'old_assignee_id', OLD.current_assignee_id,
        'new_assignee_id', NEW.current_assignee_id
      )
    );
  END IF;

  -- Log asset creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.asset_activity_log (
      asset_id,
      activity_type,
      description,
      performed_by,
      metadata
    ) VALUES (
      NEW.id,
      'created',
      'Asset created',
      auth.uid(),
      jsonb_build_object(
        'asset_name', NEW.asset_name,
        'category', NEW.category,
        'purchase_date', NEW.purchase_date
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for asset activity logging
CREATE TRIGGER trigger_log_asset_activity
AFTER INSERT OR UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.log_asset_activity();

-- Function to log service history activity
CREATE OR REPLACE FUNCTION public.log_service_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.asset_activity_log (
    asset_id,
    activity_type,
    description,
    performed_by,
    metadata
  ) VALUES (
    NEW.asset_id,
    'service_record',
    'Service record added: ' || NEW.service_type,
    auth.uid(),
    jsonb_build_object(
      'service_type', NEW.service_type,
      'service_date', NEW.service_date,
      'cost', NEW.cost,
      'vendor', NEW.vendor
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for service history logging
CREATE TRIGGER trigger_log_service_activity
AFTER INSERT ON public.service_history
FOR EACH ROW
EXECUTE FUNCTION public.log_service_activity();