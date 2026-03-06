import { z } from "zod";

// Zod Schema for validation
export const settingsSchema = z.object({
    currency: z.string().regex(/^[A-Z]{3}$/, "Debe ser un código ISO de 3 letras mayúsculas, ej: EUR, USD, ARS"),
    default_price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    default_duration: z.coerce.number().min(1, "La duración debe ser mayor a 0"),
    buffer_between_appointments: z.coerce.number().min(0, "El buffer mínimo es 0"),
    charge_no_shows: z.boolean().default(true),
    full_name: z.string().optional().nullable(),
    profession: z.string().optional().nullable(),
});

// TypeScript Types inferred from Zod
export type SettingsFormData = z.infer<typeof settingsSchema>;

// Types for Supabase DB Returns
export interface ProfileData {
    id: string;
    tenant_id?: string;
    currency: string;
    default_price: number;
    default_duration: number;
    buffer_between_appointments: number;
    charge_no_shows?: boolean;
    full_name?: string | null;
    profession?: string | null;
}

export interface AvailabilityData {
    id: string;
    tenant_id?: string;
    professional_id?: string;
    weekday: number;
    start_time: string;
    end_time: string;
}

export interface BlockData {
    id: string;
    tenant_id?: string;
    professional_id: string;
    start_at: string;
    end_at: string;
    reason?: string;
}
