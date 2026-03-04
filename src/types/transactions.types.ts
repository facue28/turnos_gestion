export interface Transaction {
    id: string;
    tenant_id: string;
    professional_id: string;
    patient_id: string;
    appointment_id?: string | null;
    amount: number;
    type: 'ingreso' | 'egreso';
    method: 'efectivo' | 'transferencia';
    description?: string | null;
    created_at?: string;
}

export type CreateTransactionPayload = Omit<Transaction, 'id' | 'tenant_id' | 'professional_id' | 'created_at'>;

export interface ActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
