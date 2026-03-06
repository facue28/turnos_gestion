"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../services/settingsService";
import { SettingsFormData, AvailabilityData, BlockData } from "../types/settings.types";
import { toast } from "sonner";

// Queries
export const useSettings = (professionalId: string | null) => {
    return useQuery({
        queryKey: ["settings", professionalId],
        queryFn: () => settingsService.getProfile(professionalId!),
        enabled: !!professionalId,
    });
};

export const useAvailability = (professionalId: string | null) => {
    return useQuery({
        queryKey: ["availability", professionalId],
        queryFn: () => settingsService.getAvailability(professionalId!),
        enabled: !!professionalId,
    });
};

export const useBlocks = (professionalId: string | null) => {
    return useQuery({
        queryKey: ["blocks", professionalId],
        queryFn: () => settingsService.getBlocks(professionalId!),
        enabled: !!professionalId,
    });
};

// Mutations
export const useUpdateSettings = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SettingsFormData) => settingsService.updateProfile(professionalId!, data),
        onSuccess: () => {
            toast.success("Configuración guardada exitosamente");
            queryClient.invalidateQueries({ queryKey: ["settings", professionalId] });
        }
    });
};

export const useAddAvailability = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<AvailabilityData, "id" | "professional_id">) => settingsService.addAvailability(professionalId!, data),
        onSuccess: () => {
            toast.success("Disponibilidad agregada");
            queryClient.invalidateQueries({ queryKey: ["availability", professionalId] });
        }
    });
};

export const useDeleteAvailability = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => settingsService.deleteAvailability(professionalId!, id),
        onSuccess: () => {
            toast.success("Disponibilidad eliminada");
            queryClient.invalidateQueries({ queryKey: ["availability", professionalId] });
        }
    });
};

export const useReplaceAvailability = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ professionalId: profId, data }: { professionalId: string, data: Omit<AvailabilityData, "id" | "professional_id">[] }) =>
            settingsService.replaceAvailability(profId, data),
        onSuccess: () => {
            toast.success("Horarios actualizados exitosamente");
            queryClient.invalidateQueries({ queryKey: ["availability", professionalId] });
        }
    });
};

export const useAddBlock = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<BlockData, "id" | "professional_id">) => settingsService.addBlock(professionalId!, data),
        onSuccess: () => {
            toast.success("Bloqueo registrado");
            queryClient.invalidateQueries({ queryKey: ["blocks", professionalId] });
        }
    });
};

export const useDeleteBlock = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => settingsService.deleteBlock(professionalId!, id),
        onSuccess: () => {
            toast.success("Bloqueo eliminado");
            queryClient.invalidateQueries({ queryKey: ["blocks", professionalId] });
        }
    });
};

export const useEditBlock = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Omit<BlockData, "id" | "professional_id"> }) =>
            settingsService.editBlock(professionalId!, id, data),
        onSuccess: () => {
            toast.success("Bloqueo actualizado");
            queryClient.invalidateQueries({ queryKey: ["blocks", professionalId] });
        }
    });
};
