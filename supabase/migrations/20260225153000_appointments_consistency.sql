-- Migration: Appointments Data Consistency and Sanitation
-- Rule: Backend must strictly correlate with Frontend Spanish ENUMs

-- 1. SANITATION: Update existing appointments with old status values
UPDATE public.appointments 
SET status = 'Nueva' 
WHERE status IS NULL OR status = 'pending';

UPDATE public.appointments 
SET status = 'Realizada' 
WHERE status = 'paid';

UPDATE public.appointments 
SET status = 'Cancelada' 
WHERE status = 'cancelled';

-- 2. SANITATION: Update existing appointments with old pay_status values
UPDATE public.appointments 
SET pay_status = 'Pendiente' 
WHERE pay_status IS NULL OR pay_status = 'pending';

UPDATE public.appointments 
SET pay_status = 'Cobrado' 
WHERE pay_status = 'paid' OR (pay_status = 'Pendiente' AND paid_amount >= price AND price > 0);

-- 3. ENSURE CONSTRAINTS (Just in case they were modified or missing)
-- We drop and recreate them to be sure
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('Nueva', 'Realizada', 'Cancelada', 'No_asistio', 'Reprogramada'));

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_pay_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_pay_status_check 
CHECK (pay_status IN ('Pendiente', 'Cobrado', 'Parcial', 'OS_pendiente'));
