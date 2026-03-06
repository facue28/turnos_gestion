-- Migration: Create Global Platform Admins Layer (Maximum Security & Hardening)
-- Description: Creates a secure, backend-only writable table for SuperAdmins with a hardened private SECURITY DEFINER function.

-- 1. Create the platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Create private schema for security helpers (Best Practice)
CREATE SCHEMA IF NOT EXISTS private;

-- Grant USAGE explicitly ensuring Postgres allows looking-up functions inside this schema
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role; -- Ensure backend can also resolve it

-- 4. Create Security Definer Function in private schema
CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = '' -- Forces explicit reference, mitigating search path vulnerabilities
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = auth.uid()
  );
$$;

-- 5. Hardening: Revoke default EXECUTE privileges from PUBLIC for defense in depth
REVOKE EXECUTE ON FUNCTION private.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO authenticated; 
GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO service_role; 

-- 6. Clean old policies to ensure idempotency
DROP POLICY IF EXISTS "Platform admins can view admins" ON public.platform_admins;

-- 7. Create secure Read-Only policy for Authenticated users using the hardened helper
CREATE POLICY "Platform admins can view admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING ((SELECT private.is_platform_admin()));

-- 8. Hardening permissions (Revokes all writes from client, allowing them solely through Service Role)
REVOKE ALL ON public.platform_admins FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.platform_admins FROM authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
