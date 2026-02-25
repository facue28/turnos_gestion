import { supabase } from "@/lib/supabase";
import { ProfileData, SettingsFormData, AvailabilityData, BlockData } from "../types/settings.types";

export const settingsService = {
    // Profiles
    async getProfile(tenantId: string): Promise<ProfileData> {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("tenant_id", tenantId)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async updateProfile(tenantId: string, payload: SettingsFormData): Promise<void> {
        const { error } = await supabase
            .from("profiles")
            .update(payload)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
    },

    // Availability
    async getAvailability(tenantId: string): Promise<AvailabilityData[]> {
        const { data, error } = await supabase
            .from("weekly_availability")
            .select("*")
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
        return data;
    },

    async addAvailability(tenantId: string, payload: Omit<AvailabilityData, "id" | "tenant_id">): Promise<void> {
        const { error } = await supabase
            .from("weekly_availability")
            .insert({ ...payload, tenant_id: tenantId }); // Inject tenant_id manually on insert as asked

        if (error) throw new Error(error.message);
    },

    async deleteAvailability(tenantId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("weekly_availability")
            .delete()
            .eq("id", id)
            .eq("tenant_id", tenantId); // Safeguard

        if (error) throw new Error(error.message);
    },

    async replaceAvailability(tenantId: string, professionalId: string, payload: Omit<AvailabilityData, "id" | "tenant_id" | "professional_id">[]): Promise<void> {
        // Delete all existing
        const { error: deleteError } = await supabase
            .from("weekly_availability")
            .delete()
            .eq("tenant_id", tenantId)
            .eq("professional_id", professionalId);

        if (deleteError) throw new Error(deleteError.message);

        if (payload.length > 0) {
            // Insert new ones
            const insertPayload = payload.map(p => ({
                ...p,
                tenant_id: tenantId,
                professional_id: professionalId
            }));
            const { error: insertError } = await supabase
                .from("weekly_availability")
                .insert(insertPayload);

            if (insertError) throw new Error(insertError.message);
        }
    },

    // Blocks
    async getBlocks(tenantId: string): Promise<BlockData[]> {
        const { data, error } = await supabase
            .from("blocks")
            .select("*")
            .eq("tenant_id", tenantId)
            .gte("end_at", new Date().toISOString()); // Omitir pasados

        if (error) throw new Error(error.message);
        return data;
    },

    async addBlock(tenantId: string, payload: Omit<BlockData, "id" | "tenant_id">): Promise<void> {
        const { error } = await supabase
            .from("blocks")
            .insert({ ...payload, tenant_id: tenantId }); // payload ya trae professional_id de la capa UI

        if (error) throw new Error(error.message);
    },

    async deleteBlock(tenantId: string, id: string): Promise<void> {
        const { error } = await supabase
            .from("blocks")
            .delete()
            .eq("id", id)
            .eq("tenant_id", tenantId); // Safeguard

        if (error) throw new Error(error.message);
    },

    async editBlock(tenantId: string, id: string, payload: Omit<BlockData, "id" | "tenant_id" | "professional_id">): Promise<void> {
        const { error } = await supabase
            .from("blocks")
            .update(payload)
            .eq("id", id)
            .eq("tenant_id", tenantId);

        if (error) throw new Error(error.message);
    }
};
