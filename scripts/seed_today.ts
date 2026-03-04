import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedToday() {
    console.log("Iniciando generación de turnos para HOY...");

    const { data: professionals } = await supabase.from("profiles").select("id, tenant_id").limit(1);
    if (!professionals || professionals.length === 0) return;
    const professional = professionals[0];

    const { data: patients } = await supabase.from("patients").select("id").eq("professional_id", professional.id).limit(2);
    if (!patients || patients.length === 0) return;

    const appointments = [];
    const today = new Date(); // Obtenemos la hora actual precisa

    // Turno 1: En 1 hora a partir de ahora, Confirmada
    const d1 = new Date(today);
    d1.setHours(d1.getHours() + 1);
    const end1 = new Date(d1);
    end1.setHours(end1.getHours() + 1);

    appointments.push({
        id: randomUUID(),
        tenant_id: professional.tenant_id,
        professional_id: professional.id,
        patient_id: patients[0].id,
        start_at: d1.toISOString(),
        end_at: end1.toISOString(),
        status: "Confirmada",
        pay_status: "Pendiente",
        paid_amount: 0,
        modality: "presencial",
        price: 15000,
        duration_min: 60
    });

    // Turno 2: En 3 horas, Nueva
    if (patients.length > 1) {
        const d2 = new Date(today);
        d2.setHours(d2.getHours() + 3);
        const end2 = new Date(d2);
        end2.setHours(end2.getHours() + 1);

        appointments.push({
            id: randomUUID(),
            tenant_id: professional.tenant_id,
            professional_id: professional.id,
            patient_id: patients[1].id,
            start_at: d2.toISOString(),
            end_at: end2.toISOString(),
            status: "Nueva",
            pay_status: "Pendiente",
            paid_amount: 0,
            modality: "virtual",
            price: 20000,
            duration_min: 60
        });
    }

    const { error } = await supabase.from("appointments").insert(appointments);
    if (error) {
        console.error("Error insertando turnos de hoy:", error);
    } else {
        console.log(`¡Éxito! Generados ${appointments.length} turnos para hoy.`);
    }
}

seedToday();
