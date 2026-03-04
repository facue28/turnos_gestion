import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data, error } = await supabase
        .from("appointments")
        .select("start_at, status, patient_id")
        .gte("start_at", "2026-02-01T00:00:00Z")
        .lte("start_at", "2026-02-28T23:59:59Z");

    if (error) {
        console.error("Error fetching", error);
        return;
    }

    console.log("Turnos encontrados en Febrero 2026:");
    console.dir(data, { depth: null });
}

main();
