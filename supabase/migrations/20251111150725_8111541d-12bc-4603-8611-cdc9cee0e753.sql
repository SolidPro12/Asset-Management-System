-- Add asset_id column to assets table (nullable first)
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS asset_id text;

-- Generate unique asset_id for existing rows based on asset_tag
UPDATE public.assets
SET asset_id = COALESCE(asset_tag, 'ASSET-' || id::text)
WHERE asset_id IS NULL;

-- Now make it NOT NULL and UNIQUE
ALTER TABLE public.assets
ALTER COLUMN asset_id SET NOT NULL;

ALTER TABLE public.assets
ADD CONSTRAINT assets_asset_id_unique UNIQUE (asset_id);

-- Add a comment to the column
COMMENT ON COLUMN public.assets.asset_id IS 'Manually entered unique asset identifier';

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON public.assets(asset_id);