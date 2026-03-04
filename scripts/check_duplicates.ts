import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
            id,
            start_at,
            end_at,
            status,
            patient:patients(name)
        `)
        .order('start_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error(error);
        return;
    }

    const fs = require('fs');
    fs.writeFileSync('last_appointments.json', JSON.stringify(appointments, null, 2));
    console.log("Turnos exportados a last_appointments.json");
}

checkDuplicates();
