import { createServerClient } from "@supabase/ssr";
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
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect users if they are not logged in and try to access a protected route
    // We assume all routes inside (dashboard) are protected. And `/login` is public.
    const isLoginPage = request.nextUrl.pathname.startsWith('/login');
    const isAuthCallback = request.nextUrl.pathname.startsWith('/auth');

    // Dashboard routes are basically everything except root, login, and static assets
    // If not logged in AND not trying to access /login, redirect to /login
    if (
        !user &&
        !isLoginPage &&
        !isAuthCallback &&
        !request.nextUrl.pathname.startsWith('/_next') &&
        request.nextUrl.pathname !== '/'
    ) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // If user is logged in and trying to access /login, redirect to /hoy (dashboard)
    if (user && isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/hoy';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
