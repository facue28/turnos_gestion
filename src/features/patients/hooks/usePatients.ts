import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientService } from "../services/patientService";
import { PatientFormData } from "../types/patient.types";
import { toast } from "sonner";

export const usePatients = (tenantId: string | null) => {
    return useQuery({
        queryKey: ["patients", tenantId],
        queryFn: () => patientService.getPatients(tenantId!),
        enabled: !!tenantId,
    });
};

export const useCreatePatient = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PatientFormData) => patientService.createPatient(tenantId!, data),
        onSuccess: () => {
            toast.success("Paciente añadido correctamente");
            queryClient.invalidateQueries({ queryKey: ["patients", tenantId] });
        },
        onError: (error) => {
            toast.error(`Error al crear paciente: ${error.message}`);
        }
    });
};

export const useUpdatePatient = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: PatientFormData }) =>
            patientService.updatePatient(tenantId!, id, data),
        onSuccess: () => {
            toast.success("Datos del paciente actualizados");
            queryClient.invalidateQueries({ queryKey: ["patients", tenantId] });
        },
        onError: (error) => {
            toast.error(`Error al actualizar paciente: ${error.message}`);
        }
    });
};

export const useDeletePatient = (tenantId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => patientService.deletePatient(tenantId!, id),
        onSuccess: () => {
            toast.success("Paciente eliminado");
            queryClient.invalidateQueries({ queryKey: ["patients", tenantId] });
        },
        onError: (error) => {
            toast.error(`Error al eliminar paciente: ${error.message}`);
        }
    });
};
