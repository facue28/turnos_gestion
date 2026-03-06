"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Necesitamos instanciar un cliente de Supabase con service_role 
// para saltar RLS y poder invitar usuarios desde admin.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function inviteProfessional(email: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: "No autorizado" };
    }

    // Doble validación estricta de admin
    const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    if (!adminData) {
        return { success: false, error: "Permisos insuficientes" };
    }

    // Creamos cliente con service_role
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) {
        console.error("Error invitando usuario:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    return { success: true, data };
}

export async function getPlatformTenants() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    if (!adminData) return [];

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtenemos todos los perfiles de la base de datos
    // y los cruzamos con auth.users para ver el estado de invitación
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
        console.error("Error cargando usuarios:", usersError);
        return [];
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, profession, created_at, tenant_id');

    if (profilesError) {
        console.error("Error cargando perfiles:", profilesError);
    }

    const { data: tenants, error: tenantsError } = await supabaseAdmin
        .from('tenants')
        .select('id, name');

    // Combinar datos
    return users.users.map(u => {
        const profile = profiles?.find(p => p.id === u.id);
        const tenant = tenants?.find(t => t.id === profile?.tenant_id);

        return {
            id: u.id,
            email: u.email,
            // Consideramos confirmado si ya inició sesión al menos una vez (last_sign_in_at no nulo)
            // O si realmente el usuario confirmó el mail y no es una invitación pura.
            isConfirmed: u.last_sign_in_at !== null,
            lastSignIn: u.last_sign_in_at,
            createdAt: u.created_at,
            profile: profile || null,
            tenant: tenant || null
        };
    });
}

export async function revokeInvitation(userId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "No autorizado" };

    const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    if (!adminData) return { success: false, error: "Permisos insuficientes" };

    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Al eliminar el usuario de auth.users, ON DELETE CASCADE limpiará las tablas dependientes (tenants, profiles) 
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/admin");
    return { success: true };
}
