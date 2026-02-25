import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarService } from "../services/calendarService";
import { AppointmentData } from "../types/calendar.types";
import { toast } from "sonner";

export const useAppointments = (tenantId: string | null) => {
    return useQuery({
        queryKey: ["appointments", tenantId],
        queryFn: () => calendarService.getAppointments(tenantId!),
        enabled: !!tenantId,
    });
};

export const useCreateAppointment = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<AppointmentData, "id" | "tenant_id">) =>
            calendarService.createAppointment(tenantId!, data),
        onSuccess: () => {
            toast.success("Turno agendado");
            queryClient.invalidateQueries({ queryKey: ["appointments", tenantId] });
        }
    });
};

export const useUpdateAppointment = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<AppointmentData> }) =>
            calendarService.updateAppointment(tenantId!, id, data),
        onSuccess: () => {
            toast.success("Turno actualizado");
            queryClient.invalidateQueries({ queryKey: ["appointments", tenantId] });
        }
    });
};

export const useDeleteAppointment = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => calendarService.deleteAppointment(tenantId!, id),
        onSuccess: () => {
            toast.success("Turno eliminado");
            queryClient.invalidateQueries({ queryKey: ["appointments", tenantId] });
        }
    });
};
export const usePatientAppointments = (tenantId: string | null, patientId: string | undefined, options: { enabled?: boolean } = {}) => {
    return useQuery({
        queryKey: ["appointments", tenantId, "patient", patientId],
        queryFn: async () => {
            const all = await calendarService.getAppointments(tenantId!);
            return all
                .filter(app => app.patient_id === patientId && new Date(app.start_at) > new Date())
                .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                .slice(0, 5);
        },
        enabled: !!tenantId && !!patientId && options.enabled,
    });
};
