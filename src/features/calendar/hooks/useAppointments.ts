"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarService } from "../services/calendarService";
import { AppointmentData } from "../types/calendar.types";
import { toast } from "sonner";

export const useAppointments = (professionalId: string | null) => {
    return useQuery({
        queryKey: ["appointments", professionalId],
        queryFn: () => calendarService.getAppointments(professionalId!),
        enabled: !!professionalId,
    });
};

export const useCreateAppointment = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<AppointmentData, "id" | "professional_id">) =>
            calendarService.createAppointment(professionalId!, data),
        onSuccess: () => {
            toast.success("Turno agendado");
            queryClient.invalidateQueries({ queryKey: ["appointments", professionalId] });
        }
    });
};

export const useUpdateAppointment = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<AppointmentData> }) =>
            calendarService.updateAppointment(professionalId!, id, data),
        onSuccess: () => {
            toast.success("Turno actualizado");
            queryClient.invalidateQueries({ queryKey: ["appointments", professionalId] });
        }
    });
};

export const useDeleteAppointment = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => calendarService.deleteAppointment(professionalId!, id),
        onSuccess: () => {
            toast.success("Turno eliminado");
            queryClient.invalidateQueries({ queryKey: ["appointments", professionalId] });
        }
    });
};

export const usePatientAppointments = (professionalId: string | null, patientId: string | undefined, options: { enabled?: boolean } = {}) => {
    return useQuery({
        queryKey: ["appointments", professionalId, "patient", patientId],
        queryFn: async () => {
            const all = await calendarService.getAppointments(professionalId!);
            return all
                .filter(app => app.patient_id === patientId && new Date(app.start_at) > new Date())
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                .slice(0, 5);
        },
        enabled: !!professionalId && !!patientId && options.enabled,
    });
};
