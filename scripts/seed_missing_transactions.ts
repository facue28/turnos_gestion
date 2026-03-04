import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const methods = ['efectivo', 'transferencia'];
const descriptions = ['Consulta General', 'Terapia Sesión', 'Control Mensual', 'Tratamiento Especial'];

async function seedMissingTransactions() {
    console.log("Fetching professional...");
    const { data: professionals } = await supabase
        .from("profiles")
        .select("id, tenant_id")
        .limit(1);

    if (!professionals || professionals.length === 0) {
        throw new Error("No professional found.");
    }
    const { id: professionalId, tenant_id: tenantId } = professionals[0];
    console.log("Professional ID:", professionalId);

    // 1. Fetch all appointments that are paid (Cobrado or Parcial) from Jan 2026
    console.log("Fetching paid appointments without transactions...");
    const { data: paidApps, error: appError } = await supabase
        .from("appointments")
        .select("id, patient_id, price, paid_amount, pay_status, start_at")
        .eq("professional_id", professionalId)
        .in("pay_status", ["Cobrado", "Parcial"])
        .gte("start_at", "2026-01-01T00:00:00Z");

    if (appError) throw new Error(appError.message);
    console.log(`Found ${paidApps?.length ?? 0} paid appointments.`);

    if (!paidApps || paidApps.length === 0) {
        console.log("Nothing to insert.");
        return;
    }

    // 2. Fetch existing transactions to avoid duplicates
    const { data: existingTrx } = await supabase
        .from("transactions")
        .select("appointment_id")
        .eq("professional_id", professionalId)
        .gte("created_at", "2026-01-01T00:00:00Z");

    const alreadyLinked = new Set((existingTrx || []).map(t => t.appointment_id).filter(Boolean));
    console.log(`Already have ${alreadyLinked.size} transactions linked to appointments.`);

    // 3. Build transactions only for appointments that don't have one yet
    const toInsert = paidApps
        .filter(app => !alreadyLinked.has(app.id))
        .map(app => ({
            professional_id: professionalId,
            tenant_id: tenantId,
            patient_id: app.patient_id,
            appointment_id: app.id,
            amount: app.paid_amount || app.price,
            type: 'ingreso',
            method: methods[Math.floor(Math.random() * methods.length)],
            description: descriptions[Math.floor(Math.random() * descriptions.length)],
            // Timestamp: same day as the appointment (at end time)
            created_at: app.start_at
        }));

    console.log(`Creating ${toInsert.length} new transactions...`);

    if (toInsert.length === 0) {
        console.log("All appointments already have transactions. Nothing to do.");
        return;
    }

    // Insert in batches of 50 to avoid request size limits
    const batchSize = 50;
    let totalInserted = 0;
    for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
            .from("transactions")
            .insert(batch);

        if (insertError) {
            console.error(`Batch ${i / batchSize + 1} error:`, JSON.stringify(insertError, null, 2));
        } else {
            totalInserted += batch.length;
            console.log(`  ✓ Batch ${i / batchSize + 1}: ${batch.length} transactions inserted.`);
        }
    }

    console.log(`\n✅ Done! Total new transactions inserted: ${totalInserted}`);

    // Final verification
    const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", professionalId)
        .gte("created_at", "2026-01-01T00:00:00Z");

    const { data: sumData } = await supabase
        .from("transactions")
        .select("amount")
        .eq("professional_id", professionalId)
        .gte("created_at", "2026-01-01T00:00:00Z");

    const total = sumData?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

    console.log(`\n=== Estado Final de la Caja ===`);
    console.log(`Total transacciones 2026: ${count}`);
    console.log(`Ingresos totales 2026:    $${total.toLocaleString("es-AR")}`);
}

seedMissingTransactions().catch(console.error);
