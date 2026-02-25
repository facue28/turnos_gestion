import { supabase } from "@/lib/supabase";
import { PatientData, PatientFormData } from "../types/patient.types";

export const patientService = {
    async getPatients(tenantId: string): Promise<PatientData[]> {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    },

    async createPatient(tenantId: string, payload: PatientFormData): Promise<PatientData> {
        const { data, error } = await supabase
            .from("patients")
            .insert({ ...payload, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async updatePatient(tenantId: string, id: string, payload: PatientFormData): Promise<PatientData> {
        const { data, error } = await supabase
            .from("patients")
            .update(payload)
            .eq("id", id)
            .eq("tenant_id", tenantId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async deletePatient(tenantId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("patients")
            .delete()
            .eq("id", id)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
    }
};
