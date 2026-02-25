export type AppointmentStatus = 'Nueva' | 'Realizada' | 'Cancelada' | 'No_asistio' | 'Reprogramada';
export type PaymentStatus = 'Pendiente' | 'Cobrado' | 'Parcial' | 'OS_pendiente';
export type AppointmentModality = 'presencial' | 'virtual';

export interface AppointmentData {
    id: string;
    tenant_id: string;
    professional_id: string;
    patient_id: string;
    start_at: string;
    end_at: string;
    status: AppointmentStatus;
    pay_status: PaymentStatus;
    paid_amount: number;
    modality: AppointmentModality;
    price: number;
    duration_min: number;
    notes?: string;
    patient?: {
        name: string;
        last_name: string;
    }
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource?: any;
    type: 'appointment' | 'block';
    status?: AppointmentStatus;
}
