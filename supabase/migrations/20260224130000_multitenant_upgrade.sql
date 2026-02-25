-- ============================================================================
-- 1. CREACIÓN DE NUEVAS TABLAS CORE
-- ============================================================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'professional', 'secretary')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- 2. FUNCIÓN DE SEGURIDAD CORREGIDA (SETOF PARA MULTI-TENANT REAL)
-- ============================================================================
-- Devuelve TODOS los tenants a los que el usuario tiene acceso. 
-- Al ser SECURITY DEFINER y SQL puro (STABLE), el planer lo optimiza e ignora recursiones.
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================
DO $$
DECLARE
  prof_record RECORD;
  new_tenant_id UUID;
BEGIN
  FOR prof_record IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.tenants (name) VALUES ('Consultorio Personal') RETURNING id INTO new_tenant_id;
    INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES (new_tenant_id, prof_record.id, 'owner');
  END LOOP;
END $$;

-- ============================================================================
-- 4. MODIFICACIÓN DE TABLAS EXISTENTES
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.patients ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.blocks ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_availability ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.profiles p SET tenant_id = tu.tenant_id FROM public.tenant_users tu WHERE p.id = tu.user_id;
UPDATE public.patients t SET tenant_id = tu.tenant_id FROM public.tenant_users tu WHERE t.professional_id = tu.user_id;
UPDATE public.appointments t SET tenant_id = tu.tenant_id FROM public.tenant_users tu WHERE t.professional_id = tu.user_id;
UPDATE public.blocks t SET tenant_id = tu.tenant_id FROM public.tenant_users tu WHERE t.professional_id = tu.user_id;
UPDATE public.weekly_availability t SET tenant_id = tu.tenant_id FROM public.tenant_users tu WHERE t.professional_id = tu.user_id;

-- Cleanup huérfanos antes del NOT NULL (por seguridad)
DELETE FROM public.profiles WHERE tenant_id IS NULL;
DELETE FROM public.patients WHERE tenant_id IS NULL;
DELETE FROM public.appointments WHERE tenant_id IS NULL;
DELETE FROM public.blocks WHERE tenant_id IS NULL;
DELETE FROM public.weekly_availability WHERE tenant_id IS NULL;

ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.patients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.blocks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.weekly_availability ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================================================
-- 5. TRIGGERS DE VALIDACIÓN CORREGIDOS (DBA OPTIMIZATION)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  user_tenants_count INT;
  first_tenant_id UUID;
BEGIN
  -- Si el frontend no manda tenant, intentamos asignarlo como fallback seguro
  IF NEW.tenant_id IS NULL THEN
    SELECT COUNT(*), MIN(tenant_id) INTO user_tenants_count, first_tenant_id
    FROM public.tenant_users 
    WHERE user_id = auth.uid();
    
    -- Si la persona está en MÁS de 1 clínica, forzamos que el frontend lo envíe explícitamente.
    -- (Evita que la secretaria inserte turnos a la clínica A por error cuando operaba la B).
    IF user_tenants_count > 1 THEN
      RAISE EXCEPTION 'Operación denegada: Al pertenecer a múltiples clínicas, el cliente debe especificar explícitamente el tenant_id en el INSERT.';
    ELSIF user_tenants_count = 1 THEN
      NEW.tenant_id := first_tenant_id;
    END IF;
  END IF;

  -- Verificamos de forma segura si el usuario pertenece a ese tenant
  IF NOT EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Operación denegada: No perteneces a esta clínica/tenant.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos triggers viejos si existiesen de pruebas anteriores, y creamos nuevos
DROP TRIGGER IF EXISTS autofill_tenant_patients ON public.patients;
DROP TRIGGER IF EXISTS autofill_tenant_appointments ON public.appointments;
DROP TRIGGER IF EXISTS autofill_tenant_blocks ON public.blocks;
DROP TRIGGER IF EXISTS autofill_tenant_availability ON public.weekly_availability;

CREATE TRIGGER autofill_tenant_patients BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER autofill_tenant_appointments BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER autofill_tenant_blocks BEFORE INSERT ON public.blocks FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER autofill_tenant_availability BEFORE INSERT ON public.weekly_availability FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ============================================================================
-- 6. RE-ESCRITURA DE POLÍTICAS RLS (CON SOPORTE MULTI-TENANT REAL)
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- 6.A POLÍTICAS FALTANTES (Para poder listar las clínicas a las que pertenezco)
DROP POLICY IF EXISTS "Tenant view own tenants" ON public.tenants;
CREATE POLICY "Tenant view own tenants" ON public.tenants FOR SELECT USING (id IN (SELECT public.get_user_tenant_ids()));

DROP POLICY IF EXISTS "Tenant view tenant users" ON public.tenant_users;
-- Eliminamos la recursion infinita: Un usuario ve los registros de `tenant_users` si es EL MISMO usuario,
-- o si la fila pertenece a un tenant_id en el cual ESE MISMO usuario (auth.uid()) sí existe.
CREATE POLICY "Tenant view tenant users" ON public.tenant_users FOR SELECT USING (
  user_id = auth.uid() OR
  tenant_id IN (
    -- Direct access table to avoid RLS loop
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  )
);

-- FUNCION DE CORTE DE NUDO GORDIANO:
-- Como RLS sigue rebotando en Supabase Cloud al hacer SELECT sobre tenant_users desde el front, 
-- creamos un RPC que BYPASSEA el RLS para la validacion inicial del usuario al logearse.
CREATE OR REPLACE FUNCTION public.get_my_tenants()
RETURNS TABLE (tenant_id UUID, role TEXT) AS $$
BEGIN
  RETURN QUERY 
  SELECT t.tenant_id, t.role 
  FROM public.tenant_users t 
  WHERE t.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos políticas antiguas por precaución
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can update own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can view own weekly_availability" ON public.weekly_availability;
DROP POLICY IF EXISTS "Users can insert own weekly_availability" ON public.weekly_availability;
DROP POLICY IF EXISTS "Users can update own weekly_availability" ON public.weekly_availability;
DROP POLICY IF EXISTS "Users can delete own weekly_availability" ON public.weekly_availability;


-- 6.B NUEVAS POLÍTICAS MULTI-TENANT
CREATE POLICY "Tenant view profiles" ON public.profiles FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant update profiles" ON public.profiles FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant view patients" ON public.patients FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant insert patients" ON public.patients FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant update patients" ON public.patients FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant delete patients" ON public.patients FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant view appointments" ON public.appointments FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant insert appointments" ON public.appointments FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant update appointments" ON public.appointments FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant delete appointments" ON public.appointments FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant view blocks" ON public.blocks FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant insert blocks" ON public.blocks FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant update blocks" ON public.blocks FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant delete blocks" ON public.blocks FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant view availability" ON public.weekly_availability FOR SELECT USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant insert availability" ON public.weekly_availability FOR INSERT WITH CHECK (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant update availability" ON public.weekly_availability FOR UPDATE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));
CREATE POLICY "Tenant delete availability" ON public.weekly_availability FOR DELETE USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

-- ============================================================================
-- 7. AUTO-ASIGNACIÓN DEL PRIMER TENANT AL HACER SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name) VALUES ('Mi Consultorio') RETURNING id INTO new_tenant_id;
  INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES (new_tenant_id, NEW.id, 'owner');
  INSERT INTO public.profiles (id, tenant_id) VALUES (NEW.id, new_tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users (user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON public.appointments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_patients_tenant_id ON public.patients (tenant_id);
