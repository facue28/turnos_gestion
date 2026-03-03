import { createClient } from "@/utils/supabase/client";
import { LoginCredentials } from "../types/auth.types";

export const authService = {
    async login({ email, password }: LoginCredentials): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw new Error(error.message);
    },

    async signOut(): Promise<void> {
        const supabase = createClient();
        await supabase.auth.signOut();
    }
};
