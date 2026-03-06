-- Migration: Add B2B Identity to Profiles
-- Description: Agrega las columnas de nombre completo y profesión para la personalización estética del Tenant y del panel de Súper Administrador.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession TEXT;
