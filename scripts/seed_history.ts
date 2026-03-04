import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { addDays, subDays } from "date-fns";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE URL or SERVICE ROLE KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedHistory() {
    try {
        console.log("Fetching demo professional...");
        // Let's find the main professional by querying a known demo user or just fetching the first one.
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

        console.log(`Found ${patients.length} patients. Creating historic appointments...`);

        const appointmentsToInsert = [];
        const today = new Date();

        // We will create historic appointments for the first 3 patients
        const targetPatients = patients.slice(0, 3);

        const modalities = ['presencial', 'virtual'];
        const states = ['Realizada', 'Cancelada', 'No_asistio'];
        const payStates = ['Cobrado', 'Pendiente', 'Parcial'];

        for (let i = 0; i < targetPatients.length; i++) {
            const patient = targetPatients[i];

            // Define a frequency: Patient 0 (every 7 days), Patient 1 (every 14 days), Patient 2 (random sparse)
            const daysBetween = i === 0 ? 7 : (i === 1 ? 14 : 21);
            let currentDate = subDays(today, 60); // Start 2 months ago

            let count = 0;
            while (currentDate < today && count < 8) {
                // Randomize data slightly
                const isRealized = Math.random() > 0.2; // 80% chance of Realizada
                const status = isRealized ? 'Realizada' : states[Math.floor(Math.random() * states.length)];

                let payStatus = payStates[Math.floor(Math.random() * payStates.length)];
                if (status === 'Cancelada' || status === 'No_asistio') {
                    payStatus = 'Pendiente';
                } else if (status === 'Realizada') {
                    payStatus = 'Cobrado'; // Most realized are paid
                }

                const price = 25000 + Math.floor(Math.random() * 15000);
                const paidAmount = payStatus === 'Cobrado' ? price : (payStatus === 'Parcial' ? price / 2 : 0);

                // Set time to something random between 10:00 and 17:00
                const hour = 10 + Math.floor(Math.random() * 7);
                currentDate.setHours(hour, 0, 0, 0);

                const endAt = new Date(currentDate);
                endAt.setMinutes(endAt.getMinutes() + 45); // 45 min duration

                appointmentsToInsert.push({
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
                    duration_min: 45
                });

                currentDate = addDays(currentDate, daysBetween);
                count++;
            }
        }

        console.log(`Inserting ${appointmentsToInsert.length} historic appointments...`);

        const { error: insertError } = await supabase
            .from("appointments")
            .insert(appointmentsToInsert);

        if (insertError) {
            require('fs').writeFileSync('supabase_error_log.json', JSON.stringify(insertError, null, 2));
            console.error("Insert Error escrito en supabase_error_log.json");
            throw new Error(insertError.message);
        }

        console.log("Successfully seeded history!");

    } catch (err) {
        console.error("Script failed:", err);
    }
}

seedHistory();
