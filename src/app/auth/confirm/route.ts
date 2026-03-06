import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/hoy'

    if (token_hash && type) {
        const supabase = await createClient()

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Si la invitación fue exitosa, forzamos la ida a la pantalla de crear su clave
            if (type === 'invite') {
                const url = request.nextUrl.clone()
                url.pathname = '/auth/update-password'
                url.searchParams.delete('token_hash')
                url.searchParams.delete('type')
                return NextResponse.redirect(url)
            }

            // Para otros flujos (recupero de pass, magic link)
            const url = request.nextUrl.clone()
            url.pathname = next
            url.searchParams.delete('token_hash')
            url.searchParams.delete('type')
            return NextResponse.redirect(url)
        }
    }

    // Si el token es inválido o expiró
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'invalid_token')
    return NextResponse.redirect(url)
}
