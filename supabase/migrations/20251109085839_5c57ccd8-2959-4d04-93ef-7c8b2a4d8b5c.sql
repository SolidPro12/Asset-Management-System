-- Add employee_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN employee_id TEXT UNIQUE;