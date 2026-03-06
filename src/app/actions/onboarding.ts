"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: {
    fullName: string;
    profession: string;
    clinicName: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("No autorizado");
    }

    // 1. Obtener el perfil para saber qué tenant_id tiene
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (profileError || !profile?.tenant_id) {
        console.error("Error al obtener perfil:", profileError);
        throw new Error("No se pudo encontrar el perfil o la clínica asociada.");
    }

    // 2. Actualizar el Perfil del Profesional
    const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
            full_name: formData.fullName,
            profession: formData.profession
        })
        .eq("id", user.id);

    if (updateProfileError) {
        console.error("Error al actualizar perfil:", updateProfileError);
        throw new Error("Error al guardar tus datos personales.");
    }

    // 3. Actualizar el nombre de la Clínica (Tenant)
    const { error: updateTenantError } = await supabase
        .from("tenants")
        .update({
            name: formData.clinicName
        })
        .eq("id", profile.tenant_id);

    if (updateTenantError) {
        console.error("Error al actualizar clínica:", updateTenantError);
        throw new Error("Error al guardar el nombre de tu clínica.");
    }

    // 4. Revalidar y Redirigir
    revalidatePath("/", "layout");
    return { success: true };
}
