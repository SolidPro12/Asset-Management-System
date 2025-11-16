-- Create asset_transfers table for transfer workflow
CREATE TABLE IF NOT EXISTS public.asset_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id),
  from_user_name TEXT,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),
  to_user_name TEXT NOT NULL,
  initiated_by UUID NOT NULL REFERENCES public.profiles(id),
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  from_user_approved BOOLEAN DEFAULT NULL,
  from_user_approved_at TIMESTAMP WITH TIME ZONE,
  to_user_approved BOOLEAN DEFAULT NULL,
  to_user_approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_schedules table
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  last_maintenance_date DATE,
  next_maintenance_date DATE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_history table
CREATE TABLE IF NOT EXISTS public.maintenance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE SET NULL,
  asset_name TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  maintenance_date DATE NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  performed_by_name TEXT,
  cost NUMERIC,
  vendor TEXT,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_transfers
CREATE POLICY "Users can view transfers they are involved in"
  ON public.asset_transfers FOR SELECT
  USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR 
    auth.uid() = initiated_by OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can insert transfers"
  ON public.asset_transfers FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Users can update their approval status"
  ON public.asset_transfers FOR UPDATE
  USING (
    auth.uid() = from_user_id OR 
    auth.uid() = to_user_id OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for maintenance_schedules
CREATE POLICY "All users can view maintenance schedules"
  ON public.maintenance_schedules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for maintenance_history
CREATE POLICY "All users can view maintenance history"
  ON public.maintenance_history FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage maintenance history"
  ON public.maintenance_history FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Create trigger for updated_at
CREATE TRIGGER update_asset_transfers_updated_at
  BEFORE UPDATE ON public.asset_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();