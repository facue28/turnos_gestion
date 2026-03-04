import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    await supabase.from("appointments").update({
        start_at: "2026-03-03T15:00:00Z",
        end_at: "2026-03-03T16:00:00Z"
    }).eq("id", "5e53c489-566b-431a-85d7-b84fb220298b");
    console.log("Turno de Juan Perez corregido");
}
check();
