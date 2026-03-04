import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import { AppointmentData } from "../types/calendar.types";

// Helper: obtiene el tenant_id del perfil del profesional
async function getTenantId(professionalId: string): Promise<string> {
    const { data, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", professionalId)
        .single();

    if (error || !data?.tenant_id) {
        throw new Error("No se pudo obtener el tenant_id del profesional");
    }
    return data.tenant_id;
}

export const calendarService = {
    async getAppointments(professionalId: string): Promise<AppointmentData[]> {
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                *,
                patient:patients(name)
            `)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
        return data as AppointmentData[];
    },

    async createAppointment(professionalId: string, payload: Omit<AppointmentData, "id" | "professional_id">): Promise<AppointmentData> {
        const tenantId = await getTenantId(professionalId);

        const { data, error } = await supabase
            .from("appointments")
            .insert({ ...payload, professional_id: professionalId, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as AppointmentData;
    },

    async updateAppointment(professionalId: string, id: string, payload: Partial<AppointmentData>): Promise<void> {
        // Interceptamos si hay cambios de pago para propagarlos
        if (payload.pay_status !== undefined || payload.paid_amount !== undefined) {
            // Buscamos si el turno tiene un link_id
            const { data: currentApp } = await supabase
                .from("appointments")
                .select("link_id")
                .eq("id", id)
                .single();

            if (currentApp?.link_id) {
                // Si tiene link_id, actualizamos el estado de pago en TODOS los turnos vinculados
                const { error: linkError } = await supabase
                    .from("appointments")
                    .update({
                        ...(payload.pay_status !== undefined && { pay_status: payload.pay_status }),
                        ...(payload.paid_amount !== undefined && { paid_amount: payload.paid_amount })
                    })
                    .eq("link_id", currentApp.link_id)
                    .eq("professional_id", professionalId);

                if (linkError) throw new Error(linkError.message);

                // Si el payload SOLO tenía datos de pago, ya terminamos
                const hasOtherProps = Object.keys(payload).some(k => k !== 'pay_status' && k !== 'paid_amount');
                if (!hasOtherProps) return;

                // Si había otras props (como status clínico, notas, etc), eliminamos las props financieras 
                // del payload principal para no hacer un update redundante en este id específico, 
                // aunque no pasaría nada malo, es mejor práctica.
                delete payload.pay_status;
                delete payload.paid_amount;
            }
        }

        const { error } = await supabase
            .from("appointments")
            .update(payload)
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    },

    async deleteAppointment(professionalId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("appointments")
            .delete()
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    }
};
