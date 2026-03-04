import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAppointments() {
    console.log("Iniciando siembra de Turnos end-to-end para Febrero 2026...");

    // 1. Obtener un profesional aleatorio
    const { data: professionals } = await supabase.from("profiles").select("id, tenant_id").limit(1);
    if (!professionals || professionals.length === 0) return console.error("Sin profesional");
    const professional = professionals[0];

    // 2. Obtener pacientes
    const { data: patients } = await supabase.from("patients").select("id").eq("professional_id", professional.id).limit(5);
    if (!patients || patients.length === 0) return console.error("Sin pacientes");

    // 3. Generar 12 turnos en febrero 2026 (aprox 3 por semana)
    const appointments = [];
    const transactions = [];

    // Febrero 2026 tiene 28 días. Vamos a poner turnos en los laborables.
    const startOfFeb = new Date(2026, 1, 1); // 1 de febrero

    for (let p = 0; p < patients.length; p++) {
        const patient = patients[p];
        // 2 a 3 turnos por paciente
        const numTurnos = Math.floor(Math.random() * 2) + 2;

        for (let i = 0; i < numTurnos; i++) {
            // Día aleatorio en febrero (del 2 al 27 para no caer justito en los bordes)
            const randomDay = Math.floor(Math.random() * 25) + 2;
            const hour = Math.floor(Math.random() * 8) + 9; // De 9 a 17 hs

            const startTime = new Date(2026, 1, randomDay, hour, 0, 0);
            const endTime = new Date(2026, 1, randomDay, hour + 1, 0, 0);

            const appointmentId = randomUUID();
            const price = 10000;
            const isPaid = Math.random() > 0.3; // 70% chance de estar pago
            const isPartial = isPaid ? Math.random() > 0.7 : false;

            let paidAmount = 0;
            let payStatus = "Pendiente";
            if (isPaid) {
                paidAmount = isPartial ? 5000 : price;
                payStatus = isPartial ? "Parcial" : "Cobrado";
            }

            const status = "Realizada"; // Turnos pasados

            appointments.push({
                id: appointmentId,
                tenant_id: professional.tenant_id,
                professional_id: professional.id,
                patient_id: patient.id,
                start_at: startTime.toISOString(),
                end_at: endTime.toISOString(),
                status,
                pay_status: payStatus,
                paid_amount: paidAmount,
                modality: "presencial",
                price,
                duration_min: 60,
                notes: "Turno demo de febrero generado por script",
            });

            if (paidAmount > 0) {
                transactions.push({
                    tenant_id: professional.tenant_id,
                    professional_id: professional.id,
                    patient_id: patient.id,
                    appointment_id: appointmentId,
                    amount: paidAmount,
                    type: "ingreso",
                    method: "efectivo",
                    description: `Pago por sesión (Turno de Febrero) - ${payStatus}`,
                    created_at: startTime.toISOString(),
                    updated_at: startTime.toISOString(),
                });
            }
        }
    }

    console.log(`Insertando ${appointments.length} turnos y ${transactions.length} transacciones...`);

    const { error: appError } = await supabase.from("appointments").insert(appointments);
    if (appError) {
        console.error("Error al insertar turnos:", appError.message);
        return;
    }

    if (transactions.length > 0) {
        const { error: txError } = await supabase.from("transactions").insert(transactions);
        if (txError) {
            console.error("Error al insertar transacciones asociadas:", txError.message);
            return;
        }
    }

    console.log(`¡Éxito! Generados ${appointments.length} turnos y ${transactions.length} transacciones en Febrero 2026.`);
}

seedAppointments();
