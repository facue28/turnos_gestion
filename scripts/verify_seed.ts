import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verify() {
    // Count appointments inserted from Jan 2026 onwards
    const { count: appCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("start_at", "2026-01-01T00:00:00Z");

    // Count transactions inserted from Jan 2026 onwards
    const { count: trxCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", "2026-01-01T00:00:00Z");

    // Sum of income from Jan 2026
    const { data: sumData } = await supabase
        .from("transactions")
        .select("amount")
        .gte("created_at", "2026-01-01T00:00:00Z")
        .eq("type", "ingreso");

    const total = sumData?.reduce((acc, t) => acc + Number(t.amount), 0) || 0;

    console.log(`=== Verificación de Datos Históricos ===`);
    console.log(`Turnos desde 1 Ene 2026: ${appCount ?? 0}`);
    console.log(`Transacciones desde 1 Ene 2026: ${trxCount ?? 0}`);
    console.log(`Total acumulado en Caja (2026): $${total.toLocaleString("es-AR")}`);
}

verify();
