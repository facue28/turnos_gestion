import { createClient } from "@/utils/supabase/client";
const supabase = createClient();
import { ProfileData, SettingsFormData, AvailabilityData, BlockData } from "../types/settings.types";

// Helper: obtiene el tenant_id del perfil del profesional
async function getTenantId(professionalId: string): Promise<string> {
    const { data, error } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", professionalId)
        .single();

    if (error || !data?.tenant_id) {
        console.error("Error fetching tenant_id:", error);
        throw new Error("No se pudo obtener el tenant_id del profesional");
    }
    return data.tenant_id;
}

export const settingsService = {
    // Profiles
    async getProfile(professionalId: string): Promise<ProfileData> {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", professionalId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async updateProfile(professionalId: string, payload: SettingsFormData): Promise<void> {
        const { error } = await supabase
            .from("profiles")
            .update(payload)
            .eq("id", professionalId);

        if (error) throw new Error(error.message);
    },

    // Availability
    async getAvailability(professionalId: string): Promise<AvailabilityData[]> {
        const { data, error } = await supabase
            .from("weekly_availability")
            .select("*")
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
        return data;
    },

    async addAvailability(professionalId: string, payload: Omit<AvailabilityData, "id" | "professional_id">): Promise<void> {
        const tenantId = await getTenantId(professionalId);
        const { error } = await supabase
            .from("weekly_availability")
            .insert({ ...payload, professional_id: professionalId, tenant_id: tenantId });

        if (error) throw new Error(error.message);
    },

    async deleteAvailability(professionalId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("weekly_availability")
            .delete()
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    },

    async replaceAvailability(professionalId: string, payload: Omit<AvailabilityData, "id" | "professional_id">[]): Promise<void> {
        const tenantId = await getTenantId(professionalId);

        // Delete all existing for this professional
        const { error: deleteError } = await supabase
            .from("weekly_availability")
            .delete()
            .eq("professional_id", professionalId);

        if (deleteError) throw new Error(deleteError.message);

        if (payload.length > 0) {
            const insertPayload = payload.map(p => ({
                ...p,
                professional_id: professionalId,
                tenant_id: tenantId
            }));
            const { error: insertError } = await supabase
                .from("weekly_availability")
                .insert(insertPayload);

            if (insertError) throw new Error(insertError.message);
        }
    },

    // Blocks
    async getBlocks(professionalId: string): Promise<BlockData[]> {
        const { data, error } = await supabase
            .from("blocks")
            .select("*")
            .eq("professional_id", professionalId)
            .gte("end_at", new Date().toISOString());

        if (error) throw new Error(error.message);
        return data;
    },

    async addBlock(professionalId: string, payload: Omit<BlockData, "id" | "professional_id">): Promise<void> {
        const tenantId = await getTenantId(professionalId);
        const { error } = await supabase
            .from("blocks")
            .insert({ ...payload, professional_id: professionalId, tenant_id: tenantId });

        if (error) throw new Error(error.message);
    },

    async deleteBlock(professionalId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("blocks")
            .delete()
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    },

    async editBlock(professionalId: string, id: string, payload: Omit<BlockData, "id" | "professional_id">): Promise<void> {
        const { error } = await supabase
            .from("blocks")
            .update(payload)
            .eq("id", id)
            .eq("professional_id", professionalId);

        if (error) throw new Error(error.message);
    }
};
