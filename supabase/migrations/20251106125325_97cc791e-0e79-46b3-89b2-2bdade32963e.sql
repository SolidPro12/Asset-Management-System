-- Add new columns to asset_requests table
ALTER TABLE public.asset_requests
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS specification TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
ADD COLUMN IF NOT EXISTS department TEXT;

-- Update existing request_type to support 'regular' and 'express'
-- First, add these values to the enum
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'regular';
ALTER TYPE request_type ADD VALUE IF NOT EXISTS 'express';

-- Comment: The employment_type will store 'extern', 'Intern', or 'Employee'