import { supabase } from "@/lib/supabase";
import { LoginCredentials } from "../types/auth.types";

export const authService = {
    async login({ email, password }: LoginCredentials): Promise<void> {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw new Error(error.message);
    }
};
