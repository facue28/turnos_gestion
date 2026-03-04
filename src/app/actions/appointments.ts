"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface AppointmentToday {
    id: string;
    start_at: string;
    end_at: string;
    status: 'Nueva' | 'Realizada' | 'Cancelada' | 'No_asistio' | 'Reprogramada';
    pay_status: 'Pendiente' | 'Cobrado' | 'Parcial' | 'OS_pendiente';
    price: number;
    paid_amount: number;
    modality: 'presencial' | 'virtual';
    patient: {
        name: string;
        phone: string | null;
    } | null;
}

export async function getAppointmentsToday(): Promise<AppointmentToday[]> {
    const supabase = await createClient();

    // We rely on RLS, no need to query by professional_id explicitly if auth.uid() is set.
    // We get today's start and end boundaries natively in JavaScript
    const now = new Date();

    // Set to start of today in local time
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // Set to end of today in local time
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_at,
            end_at,
            status,
            pay_status,
            price,
            paid_amount,
            modality,
            patient:patients ( name, phone )
        `)
        .gte('start_at', startOfDay.toISOString())
        .lte('start_at', endOfDay.toISOString())
        .order('start_at', { ascending: true });

    if (error) {
        console.error("Error fetching today's appointments:", error);
        throw new Error("No se pudieron cargar los turnos de hoy.");
    }

    // Patient relationships in Supabase might return an array if not a unique foreign key in the view of PostgREST,
    // but typically it returns a single object if it's a *-to-1 relation. 
    // We safely map it.
    return (appointments || []).map((app: any) => ({
        id: app.id,
        start_at: app.start_at,
        end_at: app.end_at,
        status: app.status,
        pay_status: app.pay_status,
        price: app.price || 0,
        paid_amount: app.paid_amount || 0,
        modality: app.modality,
        patient: Array.isArray(app.patient) ? app.patient[0] : app.patient
    })) as AppointmentToday[];
}

export async function updateAppointmentStatus(
    id: string,
    status: 'Nueva' | 'Realizada' | 'Cancelada' | 'No_asistio' | 'Reprogramada'
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

    if (error) {
        console.error("Error updating appointment status:", error);
        throw new Error("Error al intentar actualizar el estado del turno.");
    }

    revalidatePath('/hoy');
}

export async function updateAppointmentPaymentStatus(
    id: string,
    pay_status: 'Pendiente' | 'Cobrado' | 'Parcial' | 'OS_pendiente',
    paid_amount?: number
) {
    const supabase = await createClient();

    const updateData: any = { pay_status };
    if (paid_amount !== undefined) {
        updateData.paid_amount = paid_amount;
    }

    const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error("Error updating appointment payment status:", error);
        throw new Error("Error al intentar actualizar el estado de cobro del turno.");
    }

    revalidatePath('/hoy');
}

export async function getPatientHistory(patientId: string, limitCount?: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No autorizado");

    let query = supabase
        .from('appointments')
        .select(`
            id,
            start_at,
            status,
            pay_status,
            modality,
            price
        `)
        .eq('patient_id', patientId)
        .eq('professional_id', user.id)
        .order('start_at', { ascending: false });

    if (limitCount) {
        query = query.limit(limitCount);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching patient history:", error);
        throw new Error("No se pudo obtener el historial del paciente");
    }

    return data;
}

export async function getAppointmentsForExport(startDate: Date, endDate: Date) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("No autorizado");

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_at,
            status,
            pay_status,
            modality,
            price,
            patient:patients ( name )
        `)
        .eq('professional_id', user.id)
        .gte('start_at', startDate.toISOString())
        .lte('start_at', endDate.toISOString())
        .order('start_at', { ascending: true });

    if (error) {
        console.error("Error fetching appointments for export:", error);
        return [];
    }

    return data || [];
}
