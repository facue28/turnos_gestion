"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientService } from "../services/patientService";
import { PatientFormData } from "../types/patient.types";
import { toast } from "sonner";

export const usePatients = (professionalId: string | null) => {
    return useQuery({
        queryKey: ["patients", professionalId],
        queryFn: () => patientService.getPatients(professionalId!),
        enabled: !!professionalId,
    });
};

export const useCreatePatient = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PatientFormData) => patientService.createPatient(professionalId!, data),
        onSuccess: () => {
            toast.success("Paciente añadido correctamente");
            queryClient.invalidateQueries({ queryKey: ["patients", professionalId] });
        },
        onError: (error) => {
            toast.error(`Error al crear paciente: ${error.message}`);
        }
    });
};

export const useUpdatePatient = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: PatientFormData }) =>
            patientService.updatePatient(professionalId!, id, data),
        onSuccess: () => {
            toast.success("Datos del paciente actualizados");
            queryClient.invalidateQueries({ queryKey: ["patients", professionalId] });
        },
        onError: (error) => {
            toast.error(`Error al actualizar paciente: ${error.message}`);
        }
    });
};

export const useDeletePatient = (professionalId: string | null) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => patientService.deletePatient(professionalId!, id),
        onSuccess: () => {
            toast.success("Paciente eliminado");
            queryClient.invalidateQueries({ queryKey: ["patients", professionalId] });
        },
        onError: (error) => {
            toast.error(`Error al eliminar paciente: ${error.message}`);
        }
    });
};
