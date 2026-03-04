import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// Extraer credenciales desde el entorno local, asegúrate de correr esto donde las varibles estén accesibles
// o reemplaza temporalmente para uso directo. Usualmente .env.local de nextjs.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan las variables de entorno de Supabase.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTransactions() {
    console.log("Iniciando siembra de datos financieros de Demo...");

    // 1. Obtener un profesional aleatorio que ya exista en la base
    const { data: professionals, error: profError } = await supabase
        .from("profiles")
        .select("id, tenant_id")
        .limit(1);

    if (profError || !professionals || professionals.length === 0) {
        console.error("No se encontró ningún profesional para asignar las transacciones.");
        return;
    }
    const professional = professionals[0];

    // 2. Obtener un par de pacientes de ese profesional
    const { data: patients, error: patError } = await supabase
        .from("patients")
        .select("id")
        .eq("professional_id", professional.id)
        .limit(5);

    if (patError || !patients || patients.length === 0) {
        console.error("No se encontraron pacientes para este profesional. Crea algunos primero en la app.");
        return;
    }

    // 3. Generar transacciones simuladas para el último mes
    const transactions = [];
    const today = new Date();

    // Vamos a retroceder hasta 30 días aleatoriamente
    for (let i = 0; i < 15; i++) { // Crearemos 15 movimientos
        const randomPatient = patients[Math.floor(Math.random() * patients.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(today.getDate() - daysAgo);

        // Monto aleatorio entre 3000 y 15000 en incrementos de 500
        const rawAmount = Math.floor(Math.random() * 24) * 500 + 3000;

        // Un 20% de probabilidad de que sea un egreso, 80% que sea ingreso
        const isIngreso = Math.random() > 0.2;

        // Método simulado
        const methods = ["efectivo", "transferencia"];
        const method = methods[Math.floor(Math.random() * methods.length)];

        transactions.push({
            tenant_id: professional.tenant_id,
            professional_id: professional.id,
            patient_id: randomPatient.id,
            amount: rawAmount,
            type: isIngreso ? "ingreso" : "egreso",
            method: method,
            description: isIngreso ? `Demo: Pago por sesión (${method})` : `Demo: Reintegro de saldo`,
            created_at: date.toISOString(),
            updated_at: date.toISOString(),
        });
    }

    // 4. Insertar en base de datos
    console.log(`Insertando ${transactions.length} transacciones...`);

    const { error: insertError } = await supabase
        .from("transactions")
        .insert(transactions);

    if (insertError) {
        console.error("Error al insertar transacciones de demo:", insertError.message);
    } else {
        console.log("¡Siembra completada con éxito! Revisa la Caja en tu local.");
    }
}

seedTransactions();
