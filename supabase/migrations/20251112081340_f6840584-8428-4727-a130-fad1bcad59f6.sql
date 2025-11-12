-- Extend asset_history table to support comprehensive movement tracking
ALTER TABLE public.asset_history
ADD COLUMN IF NOT EXISTS asset_name TEXT,
ADD COLUMN IF NOT EXISTS asset_code TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('assigned', 'returned', 'maintenance', 'transfer', 'repair')),
ADD COLUMN IF NOT EXISTS details TEXT,
ADD COLUMN IF NOT EXISTS performed_by_email TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('excellent', 'good', 'fair')),
ADD COLUMN IF NOT EXISTS action_date DATE DEFAULT CURRENT_DATE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_history_action_date ON public.asset_history(action_date DESC);
CREATE INDEX IF NOT EXISTS idx_asset_history_action ON public.asset_history(action);
CREATE INDEX IF NOT EXISTS idx_asset_history_category ON public.asset_history(category);

-- Add comment to the table
COMMENT ON TABLE public.asset_history IS 'Comprehensive asset movement history including assignments, returns, maintenance, transfers, and repairs';