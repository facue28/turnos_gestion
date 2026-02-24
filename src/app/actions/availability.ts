"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addAvailability(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    const weekday = Number(formData.get("weekday"));
    const start_time = formData.get("start_time") as string;
    const end_time = formData.get("end_time") as string;

    if (start_time >= end_time) {
        return { error: "La hora de inicio debe ser menor a la hora de fin" };
    }

    const { error } = await supabase
        .from("weekly_availability")
        .insert({
            professional_id: user.id,
            weekday,
            start_time,
            end_time,
        });

    if (error) {
        return { error: "Error al guardar la disponibilidad" };
    }

    revalidatePath("/ajustes");
    return { success: true };
}

export async function deleteAvailability(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "No autorizado" };

    const id = formData.get("id") as string;

    const { error } = await supabase
        .from("weekly_availability")
        .delete()
        .eq("id", id)
        .eq("professional_id", user.id);

    if (error) return { error: "Error al eliminar" };

    revalidatePath("/ajustes");
    return { success: true };
}
