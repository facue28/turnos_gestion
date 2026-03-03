-- Agrega el nuevo estado 'Confirmada' al CHECK constraint de status en reservations
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations 
ADD CONSTRAINT reservations_status_check 
CHECK (status IN ('Nueva', 'Confirmada', 'Realizada', 'Cancelada', 'No_asistio', 'Reprogramada'));
