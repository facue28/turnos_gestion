"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

import { signOutAction } from '@/app/actions/auth';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isDemoMode: boolean;
    isPlatformAdmin: boolean;
    authError: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isDemoMode: false,
    isPlatformAdmin: false,
    authError: null,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initializeAuth() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    setSession(session);
                    setUser(session?.user || null);
                }
            } catch (error) {
                console.error('Error fetching session:', error);
                if (mounted) {
                    setAuthError(error instanceof Error ? error.message : "Error de sesion");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, currentSession) => {
                if (!mounted) return;
                setSession(currentSession);
                setUser(currentSession?.user || null);
                setLoading(false);

                if (_event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    // No redireccionamos aquí porque signOutAction ya hace el redirect
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, router]);

    // Verificar Rol de Administrador Súper de Plataforma
    useEffect(() => {
        let mounted = true;

        async function checkAdminStatus() {
            if (!user) {
                if (mounted) setIsPlatformAdmin(false);
                return;
            }
            try {
                const { data } = await supabase
                    .from('platform_admins')
                    .select('user_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (mounted) {
                    setIsPlatformAdmin(!!data);
                }
            } catch (error) {
                if (mounted) setIsPlatformAdmin(false);
            }
        }

        checkAdminStatus();

        return () => {
            mounted = false;
        };
    }, [user?.id, supabase]);

    const isDemoMode = user?.email === process.env.NEXT_PUBLIC_DEMO_EMAIL;

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            await signOutAction();
        } catch (e) {
            console.error("Sign out error:", e);
            // Si falla el servidor, intentamos forzar redirect
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            loading,
            isDemoMode,
            isPlatformAdmin,
            authError,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

