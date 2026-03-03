"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    isDemoMode: boolean;
    authError: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    isDemoMode: false,
    authError: null,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
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
                    router.push('/login');
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase, router]);

    const isDemoMode = user?.email === 'demo@turnos-gestion.local';

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            router.push('/login');
        } catch (e) {
            console.error("Sign out error:", e);
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            loading,
            isDemoMode,
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
