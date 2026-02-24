"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addBlock(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    const start_at = formData.get("start_at") as string;
    const end_at = formData.get("end_at") as string;
    const reason = formData.get("reason") as string || null;

    if (new Date(start_at) >= new Date(end_at)) {
        return { error: "La fecha/hora de inicio debe ser menor a la de fin" };
    }

    const { error } = await supabase
        .from("blocks")
        .insert({
            professional_id: user.id,
            start_at,
            end_at,
            reason,
        });

    if (error) {
        return { error: "Error al guardar el bloqueo" };
    }

    revalidatePath("/ajustes");
    return { success: true };
}

export async function deleteBlock(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    const id = formData.get("id") as string;

    const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("id", id)
        .eq("professional_id", user.id);

    if (error) return { error: "Error al eliminar" };

    revalidatePath("/ajustes");
    return { success: true };
}
