import { supabase } from "@/lib/supabase";
import { AppointmentData } from "../types/calendar.types";

export const calendarService = {
    async getAppointments(tenantId: string): Promise<AppointmentData[]> {
        const { data, error } = await supabase
            .from("appointments")
            .select(`
                *,
                patient:patients(name, last_name)
            `)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
        return data as AppointmentData[];
    },

    async createAppointment(tenantId: string, payload: Omit<AppointmentData, "id" | "tenant_id">): Promise<void> {
        const { error } = await supabase
            .from("appointments")
            .insert({ ...payload, tenant_id: tenantId });

        if (error) throw new Error(error.message);
    },

    async updateAppointment(tenantId: string, id: string, payload: Partial<AppointmentData>): Promise<void> {
        const { error } = await supabase
            .from("appointments")
            .update(payload)
            .eq("id", id)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
    },

    async deleteAppointment(tenantId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("appointments")
            .delete()
            .eq("id", id)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
    }
};
