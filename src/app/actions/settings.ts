"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
    currency: z.string().regex(/^[A-Z]{3}$/, "Debe ser un código ISO de 3 letras mayúsculas, ej: EUR, USD, ARS"),
    default_price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    default_duration: z.coerce.number().min(1, "La duración debe ser mayor a 0"),
    buffer_between_appointments: z.coerce.number().min(0, "El buffer mínimo es 0"),
});

export type SettingsSubmitStatus = {
    success?: string;
    error?: string;
    fieldErrors?: Record<string, string[]>;
};

export async function updateSettings(prevState: SettingsSubmitStatus | null, formData: FormData): Promise<SettingsSubmitStatus> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "No autorizado" };
    }

    const rawData = {
        currency: formData.get("currency"),
        default_price: formData.get("default_price"),
        default_duration: formData.get("default_duration"),
        buffer_between_appointments: formData.get("buffer_between_appointments"),
    };

    const parsed = settingsSchema.safeParse(rawData);

    if (!parsed.success) {
        return {
            error: "Error de validación",
            fieldErrors: parsed.error.flatten().fieldErrors
        };
    }

    const { error: updateError } = await supabase
        .from("profiles")
        .update({
            currency: parsed.data.currency,
            default_price: parsed.data.default_price,
            default_duration: parsed.data.default_duration,
            buffer_between_appointments: parsed.data.buffer_between_appointments,
        })
        .eq("id", user.id);

    if (updateError) {
        return { error: "Error al guardar en la base de datos" };
    }

    revalidatePath("/ajustes");
    return { success: "Configuración guardada exitosamente" };
}
