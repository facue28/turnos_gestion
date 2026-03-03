-- Migration: Seed Demo Patients in Database
-- Purpose: Make demo mode realistic and persistent for testing

-- 1. Ensure the Demo Tenant exists
INSERT INTO public.tenants (id, name, plan_type)
VALUES ('00000000-0000-0000-0000-000000000000', 'Clínica Demo', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 2. Clean up existing demo patients for this specific tenant to avoid duplicates on re-run
DELETE FROM public.patients 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- 3. Seed Mock Patients
INSERT INTO public.patients (tenant_id, name, alias, phone, email, insurance, notes)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Juan Pérez', 'Juan', '+54 11 5555-0001', 'juan.perez@example.com', 'OSDE 310', 'Paciente regular, prefiere turnos por la mañana.'),
('00000000-0000-0000-0000-000000000000', 'María García', 'Maru', '+54 11 5555-0002', 'maria.garcia@example.com', 'Galeno Oro', 'Viene por fisioterapia.'),
('00000000-0000-0000-0000-000000000000', 'Ricardo Medina', 'Richi', '+54 11 5555-0003', 'r.medina@example.com', 'Particular', 'Control post-operatorio.'),
('00000000-0000-0000-0000-000000000000', 'Lucía Fernández', 'Lu', '+54 11 5555-0004', 'lucia.f@example.com', 'Swiss Medical', 'Traer estudios previos.'),
('00000000-0000-0000-0000-000000000000', 'Carlos Sosa', 'Charly', '+54 11 5555-0005', 'c.sosa@example.com', 'PAMI', 'Paciente jubilado.'),
('00000000-0000-0000-0000-000000000000', 'Elena Ríos', 'Ele', '+54 11 5555-0006', 'elena.rios@example.com', 'IOMA', 'Recordar confirmar por WhatsApp.'),
('00000000-0000-0000-0000-000000000000', 'Marcos Giménez', 'Mark', '+54 11 5555-0007', 'mg@example.com', 'Particular', 'Consulta inicial.'),
('00000000-0000-0000-0000-000000000000', 'Sofía Castro', 'Sofi', '+54 11 5555-0008', 'scastro@example.com', 'Medicus', 'Embarazo 6 meses.'),
('00000000-0000-0000-0000-000000000000', 'Javier López', 'Javi', '+54 11 5555-0009', 'j.lopez@example.com', 'OSDE 210', 'Problemas de espalda.'),
('00000000-0000-0000-0000-000000000000', 'Beatriz Nuñez', 'Bea', '+54 11 5555-0010', 'beatriz@example.com', 'Particular', 'Prefiere consultas virtuales.');
