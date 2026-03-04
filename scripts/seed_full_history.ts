import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { addDays } from "date-fns";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFullHistory() {
    try {
        console.log("Fetching demo professional...");
        const { data: professionals, error: profError } = await supabase
            .from("profiles")
            .select("id, tenant_id")
            .limit(1);

        if (profError || !professionals || professionals.length === 0) {
            throw new Error("Could not find any professional.");
        }

        const professional = professionals[0];
        console.log("Using Professional ID:", professional.id);

        console.log("Fetching existing patients...");
        const { data: patients, error: patError } = await supabase
            .from("patients")
            .select("id, name")
            .eq("professional_id", professional.id);

        if (patError || !patients || patients.length === 0) {
            throw new Error("No patients found for this professional. Cannot seed.");
        }

        console.log(`Found ${patients.length} patients. Creating full history (Jan - Mar)...`);

        const appointmentsToInsert = [];
        const transactionsToInsert = [];

        // Empezamos el 5 de Enero de 2026
        const startDate = new Date(2026, 0, 5, 10, 0, 0, 0);
        const today = new Date();

        const modalities = ['presencial', 'virtual'];
        const methods = ['efectivo', 'transferencia', 'mercado_pago'];
        const descriptions = ['Consulta General', 'Terapia Sesión 1', 'Control Mensual', 'Tratamiento Especial'];

        // Repartimos pacientes y creamos un historial regular para ellos
        for (let i = 0; i < Math.min(6, patients.length); i++) {
            const patient = patients[i];

            // Frecuencias distintas: 7 dias, 14, 21, etc
            const daysBetween = 7 + (i * 3);
            let currentDate = new Date(startDate);

            while (currentDate < today) {
                // Agregar un poco de ruido / aleatoriedad (75% Realizada, 15% Cancelada, 10% No_asistio)
                const rand = Math.random();
                let status = 'Realizada';
                if (rand > 0.90) status = 'No_asistio';
                else if (rand > 0.75) status = 'Cancelada';

                let payStatus = 'Cobrado';
                let paidAmount = 0;
                const price = 20000 + Math.floor(Math.random() * 20000); // 20k to 40k

                if (status === 'Cancelada' || status === 'No_asistio') {
                    payStatus = 'Pendiente';
                } else {
                    // Turno cobrado
                    paidAmount = price;
                }

                // Generar ID UUID falso o dejar que supabase asigne un id (mejor que sea preasignado para la trx)
                const appId = crypto.randomUUID();

                const endAt = new Date(currentDate);
                endAt.setMinutes(endAt.getMinutes() + 50);

                appointmentsToInsert.push({
                    id: appId,
                    professional_id: professional.id,
                    tenant_id: professional.tenant_id,
                    patient_id: patient.id,
                    start_at: currentDate.toISOString(),
                    end_at: endAt.toISOString(),
                    status: status,
                    pay_status: payStatus,
                    paid_amount: paidAmount,
                    price: price,
                    modality: modalities[Math.floor(Math.random() * modalities.length)],
                    duration_min: 50
                });

                // Crear transacción si se pagó
                if (paidAmount > 0) {
                    transactionsToInsert.push({
                        professional_id: professional.id,
                        tenant_id: professional.tenant_id,
                        patient_id: patient.id,
                        appointment_id: appId,
                        amount: paidAmount,
                        type: 'ingreso', // always ingreso here
                        method: methods[Math.floor(Math.random() * methods.length)],
                        description: descriptions[Math.floor(Math.random() * descriptions.length)],
                        created_at: endAt.toISOString() // transaction happened at end of appointment
                    });
                }

                currentDate = addDays(currentDate, daysBetween);
            }
        }

        console.log(`Inserting ${appointmentsToInsert.length} historic appointments...`);
        const { error: insertAppError } = await supabase
            .from("appointments")
            .insert(appointmentsToInsert);

        if (insertAppError) {
            console.error("Insert Appointments Error:", JSON.stringify(insertAppError, null, 2));
            throw new Error(insertAppError.message);
        }

        console.log(`Inserting ${transactionsToInsert.length} historic transactions...`);
        // We do it in chunks if very large, but ~50-100 is fine in one insert
        const { error: insertTrxError } = await supabase
            .from("transactions")
            .insert(transactionsToInsert);

        if (insertTrxError) {
            console.error("Insert Transactions Error:", JSON.stringify(insertTrxError, null, 2));
            throw new Error(insertTrxError.message);
        }

        console.log("Doble éxito! Turnos y Transacciones Históricas insertadas (Ene-Mar 2026).");

    } catch (err) {
        console.error("Script failed:", err);
    }
}

seedFullHistory();
