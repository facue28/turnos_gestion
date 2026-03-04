import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMethods() {
    // Try to find what methods are accepted by inserting a test with each common variant
    // The error said: transactions_method_check constraint violated

    // Let's query an existing transaction to see its method value
    const { data, error } = await supabase
        .from("transactions")
        .select("method, type")
        .limit(5);

    console.log("Existing transactions sample:", JSON.stringify(data, null, 2));
    if (error) console.error(error);
}

checkMethods();
