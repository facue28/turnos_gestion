"use server";

import { createClient } from "@/utils/supabase/server";
import { ActionResponse, CreateTransactionPayload } from "@/types/transactions.types";
import { AppointmentStatus, PaymentStatus } from "@/features/calendar/types/calendar.types";

export async function createTransaction(payload: CreateTransactionPayload, expectedTotalForAppointment?: number): Promise<ActionResponse> {
    const supabase = await createClient();

    // 1. Obtener sesión del profesional
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    // 2. Obtener el tenant_id del profesional
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!profile?.tenant_id) return { success: false, error: "Tenant no encontrado" };

    // 3. Insertar la transacción
    const { data: transaction, error: insertError } = await supabase
        .from("transactions")
        .insert({
            ...payload,
            professional_id: user.id,
            tenant_id: profile.tenant_id
        })
        .select()
        .single();

    if (insertError) return { success: false, error: insertError.message };

    // 4. Si está ligado a un appointment, actualizar su estado de pago
    if (payload.appointment_id) {
        // Buscamos si el turno tiene link_id y el pago previo
        const { data: appData } = await supabase
            .from("appointments")
            .select("link_id, paid_amount")
            .eq("id", payload.appointment_id)
            .single();

        const currentPaid = appData?.paid_amount || 0;
        const newTotalPaid = currentPaid + payload.amount;

        let newPayStatus: PaymentStatus = 'Cobrado';
        if (expectedTotalForAppointment && newTotalPaid < expectedTotalForAppointment) {
            newPayStatus = 'Parcial';
        }

        if (appData?.link_id) {
            // Propagar a hermanos
            await supabase
                .from("appointments")
                .update({ pay_status: newPayStatus, paid_amount: newTotalPaid })
                .eq("link_id", appData.link_id);
        } else {
            // Actualizar solo este turno
            await supabase
                .from("appointments")
                .update({ pay_status: newPayStatus, paid_amount: newTotalPaid })
                .eq("id", payload.appointment_id);
        }
    }

    return { success: true, data: transaction };
}

export async function updateChargeNoShows(chargeNoShows: boolean): Promise<ActionResponse> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autorizado" };

    const { error } = await supabase
        .from("profiles")
        .update({ charge_no_shows: chargeNoShows })
        .eq("id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function getPatientBalance(patientId: string, chargeNoShows: boolean): Promise<{ balance: number, debt: number, paid: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autorizado");

    // 1. Obtener deuda total (price de turnos)
    // Regla estricta: Solo sumar si status es 'Realizada'. Si chargeNoShows es true, sumar también 'No_asistio'.
    const allowedStatuses: AppointmentStatus[] = ['Realizada'];
    if (chargeNoShows) allowedStatuses.push('No_asistio');

    const { data: appointments } = await supabase
        .from("appointments")
        .select("price, status")
        .eq("patient_id", patientId)
        .in("status", allowedStatuses);

    const totalDebt = (appointments || []).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

    // 2. Obtener pagos realizados (amount de transactions type 'ingreso')
    const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("patient_id", patientId)
        .eq("type", "ingreso");

    const totalPaid = (transactions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Balance: lo que pagó menos lo que debe. 
    // Si balance < 0, debe dinero (Deuda). Si balance > 0, es saldo a favor.
    const balance = totalPaid - totalDebt;

    return {
        balance,
        debt: totalDebt,
        paid: totalPaid
    };
}

export async function getOrphanAppointments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const past14Days = new Date(today);
    past14Days.setDate(past14Days.getDate() - 14);

    const todayISO = today.toISOString();
    const past14DaysISO = past14Days.toISOString();

    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id,
            start_at,
            end_at,
            status,
            patient:patients(name)
        `)
        .eq("professional_id", user.id)
        .in("status", ['Nueva', 'Confirmada'])
        .gte("start_at", past14DaysISO)
        .lt("start_at", todayISO)
        .order("start_at", { ascending: false });

    if (error) {
        console.error("Error fetching orphan appointments:", error);
        return [];
    }

    return data;
}

export async function getFinancialMetrics(startDate: Date, endDate: Date) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ingresosPeriodo: 0, deudaTotal: 0 };

    // 1. Ingresos en el rango de fechas
    const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "ingreso")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

    const ingresosPeriodo = (transactions || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // 2. Deuda Total Histórica
    // Necesitamos saber si el profesional cobra inasistencias
    const { data: profile } = await supabase
        .from("profiles")
        .select("charge_no_shows")
        .eq("id", user.id)
        .single();

    // Deuda = Sumatoria de los precios de los turnos Realizados (y No asistio si aplica) que NO están cobrados
    const chargeNoShows = profile?.charge_no_shows ?? true;
    const allowedStatuses: string[] = ['Realizada'];
    if (chargeNoShows) allowedStatuses.push('No_asistio');

    const { data: unpaidAppointments } = await supabase
        .from("appointments")
        .select("price, paid_amount")
        .in("status", allowedStatuses)
        // A nivel general, un turno genera deuda si su pay_status no es "Cobrado"
        .neq("pay_status", "Cobrado");

    // Calculamos la porción no pagada de cada turno
    const deudaTotal = (unpaidAppointments || []).reduce((acc, curr) => {
        const debt = Math.max(0, (Number(curr.price) || 0) - (Number(curr.paid_amount) || 0));
        return acc + debt;
    }, 0);

    return { ingresosPeriodo, deudaTotal };
}

export async function getRecentTransactions(startDate: Date, endDate: Date) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("transactions")
        .select(`
            id,
            amount,
            type,
            method,
            description,
            created_at,
            patient:patients(name),
            appointment:appointments(price)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching recent transactions:", error);
        return [];
    }

    return data;
}
