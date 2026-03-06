import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set({ name, value, ...options })
                    );
                },
            },
        }
    );

    // Refreshing the auth token
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Guard: Protegemos la ruta /admin (Middlewares Layer)
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }

        const { data, error } = await supabase
            .from('platform_admins')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            // No es Súper Admin → Redirigimos al Dashboard del profesional
            const url = request.nextUrl.clone();
            url.pathname = '/hoy';
            return NextResponse.redirect(url);
        }
    }

    // Guard para otras páginas privadas
    if (!user) {
        // Excluimos explícitamente rutas de auth y login
        if (
            !request.nextUrl.pathname.startsWith('/login') &&
            !request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
    } else {
        // Usuario autenticado -> Verificar Onboarding
        // Excluimos /onboarding, /admin, y archivos estáticos (aunque matcher ya filtra algunos)
        const isInternalPage = request.nextUrl.pathname.startsWith('/hoy') ||
            request.nextUrl.pathname.startsWith('/calendario') ||
            request.nextUrl.pathname.startsWith('/pacientes') ||
            request.nextUrl.pathname.startsWith('/ajustes') ||
            request.nextUrl.pathname.startsWith('/caja');

        if (isInternalPage) {
            // Verificamos si es SuperAdmin antes de forzar onboarding
            const { data: adminData } = await supabase
                .from('platform_admins')
                .select('user_id')
                .eq('user_id', user.id)
                .single();

            // Si no es SuperAdmin, verificamos si completó su perfil profesional
            if (!adminData) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                if (!profile?.full_name) {
                    const url = request.nextUrl.clone();
                    url.pathname = '/onboarding';
                    return NextResponse.redirect(url);
                }
            }
        }
    }

    return supabaseResponse;
}
