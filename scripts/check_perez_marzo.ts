import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: apps } = await supabase.from("appointments").select("id, start_at, end_at, status, patients(name)").gte("start_at", "2026-03-01T00:00:00Z");
    const perez = apps?.filter(a => a.patients?.name?.includes("Pérez") || a.patients?.name?.includes("Perez")) || [];
    console.log(JSON.stringify(perez, null, 2));
}
check();
