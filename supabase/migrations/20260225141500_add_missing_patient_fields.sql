-- Migration: Add missing fields to public.patients table
-- This migration adds email, insurance, and notes columns to align with the Patient Module requirements.

-- 1. Alter public.patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS insurance TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Update comments (optional but good practice)
COMMENT ON COLUMN public.patients.email IS 'Patient email address for notifications and contact.';
COMMENT ON COLUMN public.patients.insurance IS 'Health insurance or prepaid plan name (e.g., OSDE, Galeno).';
COMMENT ON COLUMN public.patients.notes IS 'Additional notes or clinical context (non-sensitive).';

-- 3. Optimization indexes (if searching by email)
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients (email);
