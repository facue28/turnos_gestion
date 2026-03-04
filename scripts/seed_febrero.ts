import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan variables de entorno, asegúrate de tener SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
    console.log("Iniciando siembra de turnos end-to-end para Febrero 2026...");

    const { data: professionals, error: profError } = await supabase.from("profiles").select("id, tenant_id").limit(1);
    if (profError || !professionals || professionals.length === 0) return console.log("No profs.");
    const prof = professionals[0];

    const { data: patients, error: patErr } = await supabase.from("patients").select("id").eq("professional_id", prof.id).limit(4);
    if (patErr || !patients || patients.length < 2) return console.log("Insuficientes pacientes. Crea al menos 4.");

    // Configuración de Febrero 2026
    const febStart = new Date(2026, 1, 1);
    const febEnd = new Date(2026, 1, 28);
    const turnos = [];
    const transacciones = [];

    // Pacientes de ejemplo
    const p1 = patients[0].id; // Semanal (Miercoles 10:00) - Cobrado total
    const p2 = patients[1].id; // Semanal (Jueves 15:00) - Pendiente / Parcial
    const p3 = patients[2].id; // Quincenal (Lunes 11:00) - Cobrado
    const p4 = patients[3] ? patients[3].id : null; // Mensual - No Asistió

    const insertAppointment = (patientId: string, dayDate: Date, hour: number, price: number, status: string, payStatus: string, partialAmmount: number = 0) => {
        const start = new Date(dayDate);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 60); // 1hr

        // Determinacion de cobro
        let finalPaidAmount = 0;
        if (payStatus === 'Cobrado') finalPaidAmount = price;
        if (payStatus === 'Parcial') finalPaidAmount = partialAmmount;

        const appId = randomUUID();

        turnos.push({
            id: appId,
            tenant_id: prof.tenant_id,
            professional_id: prof.id,
            patient_id: patientId,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            duration_min: 60,
            status: status,
            pay_status: payStatus,
            paid_amount: finalPaidAmount,
            price: price,
            modality: "presencial",
            created_at: start.toISOString(), // Simulación: Creado ese dia
            updated_at: start.toISOString(),
        });

        if (finalPaidAmount > 0) {
            transacciones.push({
                tenant_id: prof.tenant_id,
                professional_id: prof.id,
                patient_id: patientId,
                appointment_id: appId,
                amount: finalPaidAmount,
                type: 'ingreso',
                method: Math.random() > 0.5 ? 'efectivo' : 'transferencia', // los unicos permitidos
                description: payStatus === 'Cobrado' ? 'Pago completo sesión (Simulación)' : 'Pago parcial (Simulación)',
                created_at: start.toISOString(), // Misma fecha del turno
            });
        }
    };

    // Recorriendo febrero
    for (let d = new Date(febStart); d <= febEnd; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 Dom, 1 Lun, 3 Mie, 4 Jue

        if (dayOfWeek === 3) { // p1: Miércoles semanal
            insertAppointment(p1, d, 10, 15000, "Realizada", "Cobrado");
        }

        if (dayOfWeek === 4) { // p2: Jueves semanal
            const weeksPassed = Math.ceil(d.getDate() / 7);
            if (weeksPassed === 1 || weeksPassed === 3) {
                insertAppointment(p2, d, 15, 12000, "Realizada", "Pendiente"); // debe dinero
            } else {
                insertAppointment(p2, d, 15, 12000, "Realizada", "Parcial", 6000); // dio seña
            }
        }

        if (dayOfWeek === 1 && d.getDate() < 15) { // p3: Lunes primera quincena
            insertAppointment(p3, d, 11, 20000, "Realizada", "Cobrado");
        }
        if (dayOfWeek === 1 && d.getDate() >= 15 && d.getDate() < 22) { // p3: Tercer lunes
            insertAppointment(p3, d, 11, 20000, "Realizada", "Cobrado");
        }

        if (p4 && dayOfWeek === 5 && d.getDate() < 8) { // p4: Primer viernes
            insertAppointment(p4, d, 18, 15000, "No_asistio", "Pendiente"); // Ausente, debe dinero si politíca lo exige (deuda acumulada)
        }
    }

    // Ejecutar INSERT turnos
    const { error: errorApp } = await supabase.from('appointments').insert(turnos);
    if (errorApp) return console.error("Error Turnos:", errorApp);

    // Ejecutar INSERT transacciones
    const { error: errorTx } = await supabase.from('transactions').insert(transacciones);
    if (errorTx) return console.error("Error Transacciones:", errorTx);

    console.log(`¡Éxito! Generados ${turnos.length} turnos y ${transacciones.length} transacciones en Febrero 2026.`);
}

runSeed();
