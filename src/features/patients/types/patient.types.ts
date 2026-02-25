import { z } from "zod";

export const patientSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    alias: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    insurance: z.string().optional(),
    notes: z.string().optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export interface PatientData {
    id: string;
    tenant_id: string;
    name: string;
    alias: string | null;
    phone: string | null;
    email: string | null;
    insurance: string | null;
    notes: string | null;
    is_demo?: boolean;
    created_at: string;
    updated_at: string;
}
