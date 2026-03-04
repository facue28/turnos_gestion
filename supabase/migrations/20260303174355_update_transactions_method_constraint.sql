-- Update existing records to comply with the new constraint
UPDATE transactions 
SET method = 'efectivo' 
WHERE method IN ('tarjeta', 'obra_social');

-- Drop the old constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_method_check;

-- Add the new stricter constraint
ALTER TABLE transactions 
ADD CONSTRAINT transactions_method_check 
CHECK (method IN ('efectivo', 'transferencia'));
