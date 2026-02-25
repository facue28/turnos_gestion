-- Migration: Fix professional_id null error and enhance multitenant triggering
-- This migration makes professional_id optional (nullable) and ensures it is autofilled by the trigger.

-- 1. Drop NOT NULL constraints from legacy professional_id columns
ALTER TABLE public.patients ALTER COLUMN professional_id DROP NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN professional_id DROP NOT NULL;
ALTER TABLE public.blocks ALTER COLUMN professional_id DROP NOT NULL;
ALTER TABLE public.weekly_availability ALTER COLUMN professional_id DROP NOT NULL;

-- 2. Update the trigger function to handle both tenant_id and professional_id
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  user_tenants_count INT;
  first_tenant_id UUID;
BEGIN
  -- A. Autofill professional_id if missing (Audit purpose)
  IF NEW.professional_id IS NULL THEN
    NEW.professional_id := auth.uid();
  END IF;

  -- B. Autofill tenant_id if missing
  IF NEW.tenant_id IS NULL THEN
    SELECT COUNT(*), MIN(tenant_id) INTO user_tenants_count, first_tenant_id
    FROM public.tenant_users 
    WHERE user_id = auth.uid();
    
    IF user_tenants_count > 1 THEN
      RAISE EXCEPTION 'Operación denegada: Al pertenecer a múltiples clínicas, debe especificar el tenant_id.';
    ELSIF user_tenants_count = 1 THEN
      NEW.tenant_id := first_tenant_id;
    END IF;
  END IF;

  -- C. Safety Check: Verify user belongs to the target tenant
  IF NOT EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Operación denegada: No perteneces a esta clínica/tenant.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
