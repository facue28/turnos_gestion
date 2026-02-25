import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../services/settingsService";
import { SettingsFormData, AvailabilityData, BlockData } from "../types/settings.types";
import { toast } from "sonner";

// Queries
export const useSettings = (tenantId: string | null) => {
    return useQuery({
        queryKey: ["settings", tenantId],
        queryFn: () => settingsService.getProfile(tenantId!),
        enabled: !!tenantId, // Solo ejecuta si hay tenantId
    });
};

export const useAvailability = (tenantId: string | null) => {
    return useQuery({
        queryKey: ["availability", tenantId],
        queryFn: () => settingsService.getAvailability(tenantId!),
        enabled: !!tenantId,
    });
};

export const useBlocks = (tenantId: string | null) => {
    return useQuery({
        queryKey: ["blocks", tenantId],
        queryFn: () => settingsService.getBlocks(tenantId!),
        enabled: !!tenantId,
    });
};

// Mutations
export const useUpdateSettings = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SettingsFormData) => settingsService.updateProfile(tenantId!, data),
        onSuccess: () => {
            toast.success("Configuración guardada exitosamente");
            queryClient.invalidateQueries({ queryKey: ["settings", tenantId] });
        }
    });
};

export const useAddAvailability = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<AvailabilityData, "id" | "tenant_id">) => settingsService.addAvailability(tenantId!, data),
        onSuccess: () => {
            toast.success("Disponibilidad agregada");
            queryClient.invalidateQueries({ queryKey: ["availability", tenantId] });
        }
    });
};

export const useDeleteAvailability = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => settingsService.deleteAvailability(tenantId!, id),
        onSuccess: () => {
            toast.success("Disponibilidad eliminada");
            queryClient.invalidateQueries({ queryKey: ["availability", tenantId] });
        }
    });
};

export const useReplaceAvailability = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ professionalId, data }: { professionalId: string, data: Omit<AvailabilityData, "id" | "tenant_id" | "professional_id">[] }) =>
            settingsService.replaceAvailability(tenantId!, professionalId, data),
        onSuccess: () => {
            toast.success("Horarios actualizados exitosamente");
            queryClient.invalidateQueries({ queryKey: ["availability", tenantId] });
        }
    });
};

export const useAddBlock = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<BlockData, "id" | "tenant_id">) => settingsService.addBlock(tenantId!, data),
        onSuccess: () => {
            toast.success("Bloqueo registrado");
            queryClient.invalidateQueries({ queryKey: ["blocks", tenantId] });
        }
    });
};

export const useDeleteBlock = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => settingsService.deleteBlock(tenantId!, id),
        onSuccess: () => {
            toast.success("Bloqueo eliminado");
            queryClient.invalidateQueries({ queryKey: ["blocks", tenantId] });
        }
    });
};

export const useEditBlock = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Omit<BlockData, "id" | "tenant_id" | "professional_id"> }) =>
            settingsService.editBlock(tenantId!, id, data),
        onSuccess: () => {
            toast.success("Bloqueo actualizado");
            queryClient.invalidateQueries({ queryKey: ["blocks", tenantId] });
        }
    });
};
