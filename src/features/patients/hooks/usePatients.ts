import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientService } from "../services/patientService";
import { PatientFormData } from "../types/patient.types";
import { toast } from "sonner";
import { useMemo } from "react";
import { PatientData } from "../types/patient.types";

const DEMO_PATIENTS: PatientData[] = [
    {
        id: "550e8400-e21b-41d4-a716-446655440001",
        tenant_id: "demo",
        name: "Lucía Fernández",
        alias: "Lucía",
        phone: "+54 9 11 1234-5678",
        email: "lucia.f@ejemplo.com",
        insurance: "OSDE 310",
        notes: "Paciente regular, prefiere turnos por la mañana.",
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "550e8400-e21b-41d4-a716-446655440002",
        tenant_id: "demo",
        name: "Marcos Paz",
        alias: "",
        phone: "+54 9 11 8765-4321",
        email: "marcos.paz@ejemplo.com",
        insurance: "Galeno Oro",
        notes: "Primera consulta programada.",
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "550e8400-e21b-41d4-a716-446655440003",
        tenant_id: "demo",
        name: "Elena Rodríguez",
        alias: "Eli",
        phone: "+54 9 11 5555-4444",
        email: "elena.rod@ejemplo.com",
        insurance: "Swiss Medical",
        notes: "Traer estudios previos.",
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "550e8400-e21b-41d4-a716-446655440004",
        tenant_id: "demo",
        name: "Julián Gómez",
        alias: "Julio",
        phone: "+54 9 11 2222-3333",
        email: "jgomez@ejemplo.com",
        insurance: "PAMI",
        notes: "Atención prioritaria.",
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: "550e8400-e21b-41d4-a716-446655440005",
        tenant_id: "demo",
        name: "Sofía Martínez",
        alias: "Sofi",
        phone: "+54 9 11 9999-0000",
        email: "smartinez@ejemplo.com",
        insurance: "Particular",
        notes: "Control de rutina.",
        is_demo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

export const usePatients = (tenantId: string | null, isDemoMode: boolean = false) => {
    const query = useQuery({
        queryKey: ["patients", tenantId],
        queryFn: () => patientService.getPatients(tenantId!),
        enabled: !!tenantId,
    });

    const data = useMemo(() => {
        if (!query.data) return isDemoMode ? DEMO_PATIENTS : [];
        if (isDemoMode) {
            // Merge real data with demo data, avoiding duplicates if any demo-id matched
            const realIds = new Set(query.data.map(p => p.id));
            const uniqueDemo = DEMO_PATIENTS.filter(p => !realIds.has(p.id));
            return [...query.data, ...uniqueDemo];
        }
        return query.data;
    }, [query.data, isDemoMode]);

    return { ...query, data };
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
