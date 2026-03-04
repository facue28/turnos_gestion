import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPerez() {
    const { data: apps } = await supabase.from("appointments").select("*, patients(name)");
    const evs = apps?.filter(a => a.patients?.name?.includes("Pérez") || a.patients?.name?.includes("Perez")) || [];
    console.log(JSON.stringify(evs, null, 2));
}

findPerez();
