-- Add cancelled_at and cancelled_by columns to asset_requests table
ALTER TABLE public.asset_requests 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);