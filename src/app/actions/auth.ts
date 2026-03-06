"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signOutAction() {
    const supabase = await createClient();

    // Check if there is an active session
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Error signing out:", error);
        }
    }

    // Clear all caches and redirect to login
    revalidatePath("/", "layout");
    redirect("/login");
}

export async function updatePasswordAction(password: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
        password: password
    });

    if (error) {
        throw new Error(error.message);
    }

    // Cerramos la sesión en el servidor para forzar un login limpio
    await supabase.auth.signOut();
    revalidatePath("/", "layout");

    return { success: true };
}
