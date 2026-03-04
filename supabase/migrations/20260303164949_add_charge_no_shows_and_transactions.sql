-- 1. Agregar configuración de inasistencias a la tabla de perfiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS charge_no_shows BOOLEAN DEFAULT true;

-- 2. Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ingreso', 'egreso')),
    method TEXT NOT NULL CHECK (method IN ('efectivo', 'transferencia', 'tarjeta', 'obra_social')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar seguridad a nivel de filas (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad para la tabla de transacciones
CREATE POLICY "Los profesionales pueden ver sus propias transacciones"
    ON transactions
    FOR SELECT
    USING (auth.uid() = professional_id);

CREATE POLICY "Los profesionales pueden crear sus propias transacciones"
    ON transactions
    FOR INSERT
    WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Los profesionales pueden actualizar sus propias transacciones"
    ON transactions
    FOR UPDATE
    USING (auth.uid() = professional_id)
    WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Los profesionales pueden eliminar sus propias transacciones"
    ON transactions
    FOR DELETE
    USING (auth.uid() = professional_id);

-- 5. Crear índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_transactions_professional_id ON transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_transactions_patient_id ON transactions(patient_id);
