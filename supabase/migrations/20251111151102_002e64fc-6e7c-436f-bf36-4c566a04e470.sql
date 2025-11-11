-- Add asset_id column to assets table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assets' 
    AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE public.assets ADD COLUMN asset_id text;
  END IF;
END $$;

-- Generate unique asset_id for existing rows based on asset_tag
UPDATE public.assets
SET asset_id = COALESCE(asset_tag, 'ASSET-' || id::text)
WHERE asset_id IS NULL OR asset_id = '';

-- Drop existing constraint if it exists
ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_asset_id_unique;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE public.assets
ALTER COLUMN asset_id SET NOT NULL;

ALTER TABLE public.assets
ADD CONSTRAINT assets_asset_id_unique UNIQUE (asset_id);

-- Add a comment to the column
COMMENT ON COLUMN public.assets.asset_id IS 'Manually entered unique asset identifier';

-- Create an index for better query performance
DROP INDEX IF EXISTS idx_assets_asset_id;
CREATE INDEX idx_assets_asset_id ON public.assets(asset_id);