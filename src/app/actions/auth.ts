"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return redirect("/login?error=true");
    }

    revalidatePath("/", "layout");
    redirect("/hoy");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function loginWithDemo() {
    const email = process.env.DEMO_EMAIL;
    const password = process.env.DEMO_PASSWORD;

    if (!email || !password) {
        return redirect("/login?error=demo_not_configured");
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return redirect("/login?error=true");
    }

    revalidatePath("/", "layout");
    redirect("/hoy");
}
