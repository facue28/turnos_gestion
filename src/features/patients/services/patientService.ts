import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import { PatientData, PatientFormData } from "../types/patient.types";

export const patientService = {
    async getPatients(professionalId: string): Promise<PatientData[]> {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("professional_id", professionalId)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    },

    async createPatient(professionalId: string, payload: PatientFormData): Promise<PatientData> {
        // Fetch tenant_id from the professional's profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("tenant_id")
            .eq("id", professionalId)
            .single();

        const { data, error } = await supabase
            .from("patients")
            .insert({ ...payload, professional_id: professionalId, tenant_id: profile?.tenant_id })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async updatePatient(professionalId: string, id: string, payload: PatientFormData): Promise<PatientData> {
        const { data, error } = await supabase
            .from("patients")
            .update(payload)
            .eq("id", id)
            .eq("professional_id", professionalId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async deletePatient(professionalId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("patients")
            .delete()
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    }
};
