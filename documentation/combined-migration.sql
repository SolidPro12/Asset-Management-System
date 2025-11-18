-- Combined Migration Script
-- Generated: 2025-11-18T16:30:25.439Z
-- Total Migrations: 41

-- ============================================
-- IMPORTANT: Run this in Supabase SQL Editor
-- ============================================


-- ============================================
-- Created By: Vinoth Kumar B
-- ============================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'hr', 'user');

-- Create enum for asset status
CREATE TYPE public.asset_status AS ENUM ('available', 'assigned', 'under_maintenance', 'retired');

-- Create enum for asset category
CREATE TYPE public.asset_category AS ENUM ('laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'headset', 'printer', 'phone', 'tablet', 'other');

-- Create enum for request status
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled');

-- Create enum for request type
CREATE TYPE public.request_type AS ENUM ('regular', 'urgent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  asset_tag TEXT UNIQUE NOT NULL,
  category asset_category NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  specifications JSONB,
  purchase_date DATE,
  purchase_cost DECIMAL(10,2),
  status asset_status NOT NULL DEFAULT 'available',
  current_assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department TEXT,
  location TEXT,
  warranty_end_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create asset_requests table
CREATE TABLE public.asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category asset_category NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  request_type request_type NOT NULL DEFAULT 'regular',
  status request_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create asset_history table
CREATE TABLE public.asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  return_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create service_history table
CREATE TABLE public.service_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  vendor TEXT,
  cost DECIMAL(10,2),
  description TEXT,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'hr' THEN 3
      ELSE 4
    END
  LIMIT 1
$$;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- User_roles RLS Policies
CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only super admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Assets RLS Policies
CREATE POLICY "Authenticated users can view all assets"
ON public.assets FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert assets"
ON public.assets FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update assets"
ON public.assets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only super admins can delete assets"
ON public.assets FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Asset_requests RLS Policies
CREATE POLICY "Users can view all requests"
ON public.asset_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "HR and admins can create requests"
ON public.asset_requests FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Admins can update requests"
ON public.asset_requests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete requests"
ON public.asset_requests FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Asset_history RLS Policies
CREATE POLICY "Users can view all asset history"
ON public.asset_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage asset history"
ON public.asset_history FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Service_history RLS Policies
CREATE POLICY "Users can view all service history"
ON public.service_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage service history"
ON public.service_history FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at on all tables
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.asset_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_category ON public.assets(category);
CREATE INDEX idx_assets_assignee ON public.assets(current_assignee_id);
CREATE INDEX idx_asset_requests_status ON public.asset_requests(status);
CREATE INDEX idx_asset_requests_requester ON public.asset_requests(requester_id);
CREATE INDEX idx_asset_history_asset ON public.asset_history(asset_id);
CREATE INDEX idx_service_history_asset ON public.service_history(asset_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);


-- ============================================
-- Migration 2/41: 20251103105547_2202544e-07b4-4619-b5ee-1b4c9cebe2c8.sql
-- ============================================

-- Add financer role to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'financer';


-- ============================================
-- Migration 3/41: 20251103105613_cf724ee8-661e-447b-a986-ebb06d2b2f3a.sql
-- ============================================

-- Update get_user_role function to include financer in priority order
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'financer' THEN 3
      WHEN role = 'hr' THEN 4
      ELSE 5
    END
  LIMIT 1
$$;

-- Add RLS policy for financer role to update asset financial data
CREATE POLICY "Financers can update asset pricing"
ON public.assets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'financer')
);


-- ============================================
-- Migration 4/41: 20251103105633_757d6a2f-3855-40ac-ab18-6bbbc8fea934.sql
-- ============================================

-- Step 1: Add financer role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financer';


-- ============================================
-- Migration 5/41: 20251103105724_f07c17c1-8b2c-46be-94ae-32a9ed897ae4.sql
-- ============================================

-- Update get_user_role function to include financer in priority order
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'financer' THEN 3
      WHEN role = 'hr' THEN 4
      ELSE 5
    END
  LIMIT 1
$$;


-- ============================================
-- Migration 6/41: 20251103131654_0311dcdf-478d-4a34-8292-78f8d2c40a8e.sql
-- ============================================

-- Fix search_path for existing functions to prevent SQL injection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'financer' THEN 3
      WHEN role = 'hr' THEN 4
      ELSE 5
    END
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Create secure function for updating user roles with server-side validation
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super_admin
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can update roles';
  END IF;
  
  -- Prevent users from modifying their own role
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own role';
  END IF;
  
  -- Delete existing role and insert new one
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
END;
$$;


-- ============================================
-- Migration 7/41: 20251103131827_cf654ddc-c0aa-4bd5-8e50-f8c10a81bf10.sql
-- ============================================

-- Fix search_path for existing functions to prevent SQL injection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE 
      WHEN role = 'super_admin' THEN 1
      WHEN role = 'admin' THEN 2
      WHEN role = 'financer' THEN 3
      WHEN role = 'hr' THEN 4
      ELSE 5
    END
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Create secure function for updating user roles with server-side validation
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super_admin
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can update roles';
  END IF;
  
  -- Prevent users from modifying their own role
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own role';
  END IF;
  
  -- Delete existing role and insert new one
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
END;
$$;


-- ============================================
-- Migration 8/41: 20251105044828_0a4b47ce-ef38-4bd7-8ec8-e32266e72444.sql
-- ============================================

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


-- ============================================
-- Migration 9/41: 20251105115607_5b3ef82a-9190-4142-9c56-f77981101f2f.sql
-- ============================================

-- Create request_history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.asset_requests(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'updated', 'fulfilled')),
  performed_by uuid REFERENCES auth.users(id),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all request history"
  ON public.request_history
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert request history"
  ON public.request_history
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin') OR 
    has_role(auth.uid(), 'admin')
  );

-- Create index for better performance
CREATE INDEX idx_request_history_request_id ON public.request_history(request_id);
CREATE INDEX idx_request_history_created_at ON public.request_history(created_at DESC);


-- ============================================
-- Migration 10/41: 20251106125325_97cc791e-0e79-46b3-89b2-2bdade32963e.sql
-- ============================================

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


-- ============================================
-- Migration 11/41: 20251107165856_905fb577-af65-441c-83f7-f5fedae1de95.sql
-- ============================================

-- Add request_id column to asset_requests table
ALTER TABLE public.asset_requests ADD COLUMN request_id text;

-- Add is_department_head to profiles table
ALTER TABLE public.profiles ADD COLUMN is_department_head boolean DEFAULT false;

-- Create function to generate next request ID
CREATE OR REPLACE FUNCTION public.generate_request_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  -- Get the last request_id
  SELECT request_id INTO last_id
  FROM public.asset_requests
  WHERE request_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no records exist, start with AR001
  IF last_id IS NULL THEN
    RETURN 'AR001';
  END IF;
  
  -- Extract the number part and increment
  next_num := CAST(SUBSTRING(last_id FROM 3) AS integer) + 1;
  
  -- Format with leading zeros
  new_id := 'AR' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger to auto-generate request_id
CREATE OR REPLACE FUNCTION public.set_request_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_id IS NULL THEN
    NEW.request_id := generate_request_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_request_id
BEFORE INSERT ON public.asset_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_request_id();


-- ============================================
-- Migration 12/41: 20251108144214_74e2c524-9bb6-44a1-8263-82c5a3d68ec0.sql
-- ============================================

-- Add department_head to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'department_head';


-- ============================================
-- Migration 13/41: 20251108145339_cf88a789-4a73-44d2-9d46-677b93cbedca.sql
-- ============================================

-- Create ticket_priority enum
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create ticket_status enum
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create issue_category enum
CREATE TYPE public.issue_category AS ENUM ('hardware', 'software', 'network', 'access');

-- Create tickets table
CREATE TABLE public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text NOT NULL UNIQUE,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  asset_name text NOT NULL,
  location text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  issue_category issue_category NOT NULL,
  department text NOT NULL,
  attachments text,
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tickets table
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create function to generate ticket ID
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF last_id IS NULL THEN
    RETURN 'TKT001';
  END IF;
  
  next_num := CAST(SUBSTRING(last_id FROM 4) AS integer) + 1;
  new_id := 'TKT' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$$;

-- Create trigger function to set ticket_id
CREATE OR REPLACE FUNCTION public.set_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_id IS NULL THEN
    NEW.ticket_id := generate_ticket_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for ticket_id
CREATE TRIGGER trigger_set_ticket_id
BEFORE INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_ticket_id();

-- Create trigger for updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies for tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
USING (created_by = auth.uid());

CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update all tickets"
ON public.tickets
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));


-- ============================================
-- Migration 14/41: 20251108150056_358d5630-5323-4fe3-b07e-d30eb0c1e8b1.sql
-- ============================================

-- Add on_hold to ticket_status enum
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'on_hold';


-- ============================================
-- Migration 15/41: 20251109040255_ff0e9daa-58a7-4bc5-b1cc-5bbca11e5db1.sql
-- ============================================

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


-- ============================================
-- Migration 16/41: 20251109085839_5c57ccd8-2959-4d04-93ef-7c8b2a4d8b5c.sql
-- ============================================

-- Add employee_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN employee_id TEXT UNIQUE;


-- ============================================
-- Migration 17/41: 20251110065019_ed9d80cb-c67a-495b-a7a3-7e478e4f6c09.sql
-- ============================================

-- Update generate_ticket_id function to return correct format with hyphen
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  -- Get the last ticket_id
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no records exist, start with TKT-001
  IF last_id IS NULL THEN
    RETURN 'TKT-001';
  END IF;
  
  -- Extract the number part after 'TKT-' and increment
  next_num := CAST(SUBSTRING(last_id FROM 5) AS integer) + 1;
  
  -- Format with leading zeros: TKT-001, TKT-002, etc.
  new_id := 'TKT-' || LPAD(next_num::text, 3, '0');
  
  RETURN new_id;
END;
$function$;


-- ============================================
-- Migration 18/41: 20251110065122_f0655fec-0700-43d4-87c3-5b0cb8bee3de.sql
-- ============================================

-- Update set_ticket_id trigger function to handle empty strings
CREATE OR REPLACE FUNCTION public.set_ticket_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate ticket_id if it's NULL or empty string
  IF NEW.ticket_id IS NULL OR NEW.ticket_id = '' THEN
    NEW.ticket_id := generate_ticket_id();
  END IF;
  RETURN NEW;
END;
$function$;


-- ============================================
-- Migration 19/41: 20251110065623_d3b4f102-dd10-42cf-b85e-444c52b84f8f.sql
-- ============================================

-- Create ticket_history table to track all changes
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_history
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history of their own tickets or if they're admin
CREATE POLICY "Users can view relevant ticket history"
ON public.ticket_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Policy: Admins can insert ticket history
CREATE POLICY "Admins can insert ticket history"
ON public.ticket_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND tickets.created_by = auth.uid()
  )
);

-- Create trigger function to log ticket changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status::text,
      NEW.status::text,
      auth.uid(),
      'Ticket status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'assignment_change',
      COALESCE(OLD.assigned_to::text, 'unassigned'),
      COALESCE(NEW.assigned_to::text, 'unassigned'),
      auth.uid(),
      CASE 
        WHEN NEW.assigned_to IS NULL THEN 'Ticket unassigned'
        WHEN OLD.assigned_to IS NULL THEN 'Ticket assigned'
        ELSE 'Ticket reassigned'
      END
    );
  END IF;

  -- Log priority changes
  IF TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'priority_change',
      OLD.priority::text,
      NEW.priority::text,
      auth.uid(),
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;

  -- Log ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      'Ticket created'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for ticket changes
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
CREATE TRIGGER trigger_log_ticket_changes
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_changes();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created_at ON public.ticket_history(created_at DESC);


-- ============================================
-- Migration 20/41: 20251110065728_7dbf833c-8187-44e2-a9fa-33ad958933f2.sql
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view relevant ticket history" ON public.ticket_history;
DROP POLICY IF EXISTS "Admins can insert ticket history" ON public.ticket_history;

-- Create ticket_history table to track all changes
CREATE TABLE IF NOT EXISTS public.ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ticket_history
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history of their own tickets or if they're admin
CREATE POLICY "Users can view relevant ticket history"
ON public.ticket_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Policy: Admins can insert ticket history
CREATE POLICY "Admins can insert ticket history"
ON public.ticket_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND tickets.created_by = auth.uid()
  )
);

-- Create trigger function to log ticket changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status::text,
      NEW.status::text,
      auth.uid(),
      'Ticket status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;

  -- Log assignment changes
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'assignment_change',
      COALESCE(OLD.assigned_to::text, 'unassigned'),
      COALESCE(NEW.assigned_to::text, 'unassigned'),
      auth.uid(),
      CASE 
        WHEN NEW.assigned_to IS NULL THEN 'Ticket unassigned'
        WHEN OLD.assigned_to IS NULL THEN 'Ticket assigned'
        ELSE 'Ticket reassigned'
      END
    );
  END IF;

  -- Log priority changes
  IF TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      old_value,
      new_value,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'priority_change',
      OLD.priority::text,
      NEW.priority::text,
      auth.uid(),
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;

  -- Log ticket creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_history (
      ticket_id,
      action,
      changed_by,
      remarks
    ) VALUES (
      NEW.id,
      'created',
      auth.uid(),
      'Ticket created'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for ticket changes
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
CREATE TRIGGER trigger_log_ticket_changes
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_changes();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON public.ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_created_at ON public.ticket_history(created_at DESC);


-- ============================================
-- Migration 21/41: 20251110070325_dab73258-a8ff-4a5b-b9f7-fb8638806fdb.sql
-- ============================================

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_ticket_id ON public.tickets;
DROP TRIGGER IF EXISTS trigger_log_ticket_changes ON public.tickets;
DROP TRIGGER IF EXISTS log_asset_activity_trigger ON public.assets;
DROP TRIGGER IF EXISTS log_service_activity_trigger ON public.service_history;

-- Create trigger to auto-generate ticket ID
CREATE TRIGGER trigger_set_ticket_id
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ticket_id();

-- Create trigger to log ticket changes
CREATE TRIGGER trigger_log_ticket_changes
  AFTER INSERT OR UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_changes();

-- Create trigger to log asset activity
CREATE TRIGGER log_asset_activity_trigger
  AFTER INSERT OR UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_asset_activity();

-- Create trigger to log service activity
CREATE TRIGGER log_service_activity_trigger
  AFTER INSERT ON public.service_history
  FOR EACH ROW
  EXECUTE FUNCTION public.log_service_activity();


-- ============================================
-- Migration 22/41: 20251110080000_fix_generate_ticket_id_empty_string.sql
-- ============================================

-- Fix generate_ticket_id function to filter out empty strings
CREATE OR REPLACE FUNCTION public.generate_ticket_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  last_id text;
  next_num integer;
  new_id text;
BEGIN
  -- Get the last ticket_id, filtering out NULL and empty strings
  SELECT ticket_id INTO last_id
  FROM public.tickets
  WHERE ticket_id IS NOT NULL 
    AND ticket_id != ''
    AND LENGTH(TRIM(ticket_id)) > 0
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no valid records exist, start with TKT-001
  IF last_id IS NULL OR last_id = '' OR LENGTH(TRIM(last_id)) = 0 THEN
    RETURN 'TKT-001';
  END IF;
  
  -- Extract the number part after 'TKT-' or 'TKT' and increment
  -- Support both formats: TKT-001 and TKT001
  IF last_id LIKE 'TKT-%' THEN
    -- Format with hyphen: TKT-001
    next_num := CAST(SUBSTRING(last_id FROM 5) AS integer) + 1;
    new_id := 'TKT-' || LPAD(next_num::text, 3, '0');
  ELSIF last_id LIKE 'TKT%' THEN
    -- Format without hyphen: TKT001
    next_num := CAST(SUBSTRING(last_id FROM 4) AS integer) + 1;
    new_id := 'TKT' || LPAD(next_num::text, 3, '0');
  ELSE
    -- Default fallback
    RETURN 'TKT-001';
  END IF;
  
  RETURN new_id;
END;
$function$;




-- ============================================
-- Migration 23/41: 20251110173551_update_handle_new_user_employee_id.sql
-- ============================================

-- Update handle_new_user() function to save employee_id from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, employee_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'employee_id'
  );
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;




-- ============================================
-- Migration 24/41: 20251110175950_allow_hr_update_requests.sql
-- ============================================

-- Allow HR users to update their own asset requests
-- This policy allows HR role users to update requests they created

CREATE POLICY "HR can update own requests"
ON public.asset_requests FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'hr') AND 
  requester_id = auth.uid()
);




-- ============================================
-- Migration 25/41: 20251111111216_aa736c4c-9453-491c-a4f7-c0d55f5f391a.sql
-- ============================================

-- Add cancelled_at and cancelled_by columns to asset_requests table
ALTER TABLE public.asset_requests 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);


-- ============================================
-- Migration 26/41: 20251111111928_4b9a97cd-f5da-4a7d-8214-9d0578534169.sql
-- ============================================

-- Update RLS policy to allow HR to insert cancellation records into request_history
DROP POLICY IF EXISTS "Admins can insert request history" ON public.request_history;

CREATE POLICY "Admins and HR can insert request history"
ON public.request_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'hr'::app_role)
);


-- ============================================
-- Migration 27/41: 20251111112256_585cbf40-4b97-4248-ab98-593b6bde34f0.sql
-- ============================================

-- Allow HR to cancel requests via UPDATE with constrained policy
DROP POLICY IF EXISTS "HR can cancel asset requests" ON public.asset_requests;

CREATE POLICY "HR can cancel asset requests"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND status IN ('pending', 'approved')
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'cancelled'
);


-- ============================================
-- Migration 28/41: 20251111112438_c495fd40-4bfc-45ac-86e2-9608007aae2b.sql
-- ============================================

-- Update policy to only allow HR to cancel pending requests (not approved)
DROP POLICY IF EXISTS "HR can cancel asset requests" ON public.asset_requests;

CREATE POLICY "HR can cancel pending requests only"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'pending'
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND status = 'cancelled'
);


-- ============================================
-- Migration 29/41: 20251111112930_20e641c6-8c85-47fa-bb66-a4442918e2ea.sql
-- ============================================

-- Allow HR to update asset requests they created
CREATE POLICY "HR can update their own requests"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND requester_id = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role) AND requester_id = auth.uid()
);


-- ============================================
-- Migration 30/41: 20251111113028_25c07a3c-840e-4194-81b4-c66c984055e0.sql
-- ============================================

-- Update request_history policy to allow HR to insert update action records
DROP POLICY IF EXISTS "Admins and HR can insert request history" ON public.request_history;

CREATE POLICY "Admins and HR can insert request history"
ON public.request_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'hr'::app_role) AND action IN ('cancelled', 'updated', 'created'))
);


-- ============================================
-- Migration 31/41: 20251111113206_1ba6539c-f464-428b-82d6-099ac493d5a0.sql
-- ============================================

-- Drop existing HR update policy and create a new one that allows HR to edit any request created by HR
DROP POLICY IF EXISTS "HR can update their own requests" ON public.asset_requests;

CREATE POLICY "HR can update requests created by HR"
ON public.asset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'hr'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = asset_requests.requester_id 
    AND role = 'hr'::app_role
  ) AND
  status = 'pending'
)
WITH CHECK (
  has_role(auth.uid(), 'hr'::app_role)
);


-- ============================================
-- Migration 32/41: 20251111150725_8111541d-12bc-4603-8611-cdc9cee0e753.sql
-- ============================================

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


-- ============================================
-- Migration 33/41: 20251111150928_72d1aed2-0405-41b5-9240-699c6145acac.sql
-- ============================================

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


-- ============================================
-- Migration 34/41: 20251111151102_002e64fc-6e7c-436f-bf36-4c566a04e470.sql
-- ============================================

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


-- ============================================
-- Migration 35/41: 20251112080117_65bc4c5c-290a-44ae-bbb6-14669419a2db.sql
-- ============================================

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


-- ============================================
-- Migration 36/41: 20251112081340_f6840584-8428-4727-a130-fad1bcad59f6.sql
-- ============================================

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


-- ============================================
-- Migration 37/41: 20251114112554_ae4b611d-2293-4231-a751-28230dcfcd80.sql
-- ============================================

-- Add 'cancelled' value to ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'cancelled';


-- ============================================
-- Migration 38/41: 20251114121240_e0e02af9-07b4-4dfd-8278-9bb8f997e9bd.sql
-- ============================================

-- Add soft delete column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES auth.users(id);

-- Create user management log table
CREATE TABLE IF NOT EXISTS public.user_management_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  details text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_management_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view management log"
  ON public.user_management_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "System can insert management log"
  ON public.user_management_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create permission history table
CREATE TABLE IF NOT EXISTS public.permission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  old_role text,
  new_role text,
  old_department text,
  new_department text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.permission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view permission history"
  ON public.permission_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "System can insert permission history"
  ON public.permission_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create ticket comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their tickets"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can insert comments on their tickets"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_management_log_target ON public.user_management_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_user ON public.permission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- Add trigger for updated_at on ticket_comments
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- Migration 39/41: 20251114121420_476e7178-5839-40d8-8f11-5223eee93ad7.sql
-- ============================================

-- Add soft delete columns to profiles (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deactivated_at timestamp with time zone;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deactivated_by') THEN
    ALTER TABLE public.profiles ADD COLUMN deactivated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create user management log table
CREATE TABLE IF NOT EXISTS public.user_management_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  details text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_management_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view management log" ON public.user_management_log;
CREATE POLICY "Super admins can view management log"
  ON public.user_management_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "System can insert management log" ON public.user_management_log;
CREATE POLICY "System can insert management log"
  ON public.user_management_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create permission history table
CREATE TABLE IF NOT EXISTS public.permission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  old_role text,
  new_role text,
  old_department text,
  new_department text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.permission_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view permission history" ON public.permission_history;
CREATE POLICY "Super admins can view permission history"
  ON public.permission_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "System can insert permission history" ON public.permission_history;
CREATE POLICY "System can insert permission history"
  ON public.permission_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create ticket comments table
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on their tickets" ON public.ticket_comments;
CREATE POLICY "Users can view comments on their tickets"
  ON public.ticket_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Users can insert comments on their tickets" ON public.ticket_comments;
CREATE POLICY "Users can insert comments on their tickets"
  ON public.ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_comments.ticket_id
      AND (tickets.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.ticket_comments;
CREATE POLICY "Users can update their own comments"
  ON public.ticket_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.ticket_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.ticket_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_management_log_target ON public.user_management_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_history_user ON public.permission_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);

-- Add trigger for updated_at on ticket_comments
DROP TRIGGER IF EXISTS update_ticket_comments_updated_at ON public.ticket_comments;
CREATE TRIGGER update_ticket_comments_updated_at
  BEFORE UPDATE ON public.ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- ============================================
-- Migration 40/41: 20251116014418_4fb5eb87-9274-43cd-9db3-7bd04d456aa8.sql
-- ============================================

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


-- ============================================
-- Migration 41/41: 20251117025021_130f0ce0-42f7-4a19-9401-da65df591907.sql
-- ============================================

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

