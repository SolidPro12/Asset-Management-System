-- Create asset_allocations table
CREATE TABLE IF NOT EXISTS public.asset_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.assets(id) ON DELETE CASCADE,
  asset_name text NOT NULL,
  category asset_category NOT NULL,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  department text,
  allocated_date date NOT NULL DEFAULT CURRENT_DATE,
  return_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  notes text,
  allocated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_allocations
CREATE POLICY "Users can view all allocations"
ON public.asset_allocations
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert allocations"
ON public.asset_allocations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update allocations"
ON public.asset_allocations
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only super admins can delete allocations"
ON public.asset_allocations
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_asset_allocations_updated_at
BEFORE UPDATE ON public.asset_allocations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();