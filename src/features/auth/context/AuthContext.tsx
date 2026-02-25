import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    activeTenantId: string | null;
    isDemoMode: boolean;
    authError: string | null;
    setActiveTenantId: (id: string) => void;
    joinDemo: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    activeTenantId: null,
    isDemoMode: false,
    authError: null,
    setActiveTenantId: () => { },
    joinDemo: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTenantId, setActiveTenantIdState] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    // Carga inicial y listeners
    useEffect(() => {
        let mounted = true;

        // Fallback robusto por si Supabase JS se cuelga silenciosamente
        const fallbackTimer = setTimeout(() => {
            if (mounted) {
                console.warn("AuthProvider: Fallback timer triggered! Forcing UI unlock.");
                setLoading(false);
            }
        }, 3000);

        async function initializeAuth() {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (mounted) {
                    setSession(session);
                    setUser(session?.user || null);

                    if (session?.user) {
                        try {
                            await loadUserTenants(session.user.id);
                        } catch (tenantError) {
                            console.error("Critical error loading tenants during init:", tenantError);
                            setAuthError(tenantError instanceof Error ? tenantError.message : "Error cargando clinicas");
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching session:', error);
                setAuthError(error instanceof Error ? error.message : "Error de sesion");
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(fallbackTimer); // Clear timer if init completes
                }
            }
        }

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, currentSession) => {
                if (!mounted) return;
                try {
                    setSession(currentSession);
                    setUser(currentSession?.user || null);

                    if (currentSession?.user) {
                        try {
                            await loadUserTenants(currentSession.user.id);
                        } catch (e) {
                            console.error("Error loading tenants in auth change:", e);
                        }
                    } else {
                        setActiveTenantIdState(null);
                        localStorage.removeItem('turnos_active_tenant');
                    }
                } finally {
                    setLoading(false);
                    clearTimeout(fallbackTimer);
                }
            }
        );

        return () => {
            mounted = false;
            clearTimeout(fallbackTimer);
            subscription.unsubscribe();
        };
    }, []);

    // Función auxiliar para forzar un timeout en consultas de Supabase que se cuelgan
    const fetchWithTimeout = async <T,>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
        const timeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Supabase request timed out after ' + ms + 'ms')), ms);
        });
        return Promise.race([promise, timeout]);
    };

    // Cargar Tenants del usuario logueado
    const loadUserTenants = async (userId: string | undefined) => {
        if (!userId) return;

        try {
            // Usamos la RPC con un Timeout forzado de 5 segundos para que la UI no se quede Zombie
            let { data: tenantUsers, error } = await fetchWithTimeout<any>(
                supabase.rpc('get_my_tenants') as any
            );

            if (error) {
                console.error("Error fetching tenants:", error);
                throw error;
            }

            // Si es un usuario viejo que quedó sin tenant, le creamos uno por defecto
            if (!tenantUsers || tenantUsers.length === 0) {
                console.warn("No tenants found for this user. Auto-creating a default tenant...");

                const { data: newTenant, error: tenantErr } = await fetchWithTimeout<any>(
                    supabase.from('tenants').insert({ name: 'Mi Clínica', owner_id: userId }).select('id').single() as any
                );

                if (tenantErr || !newTenant) {
                    console.error("Failed to auto-create tenant:", tenantErr);
                    setAuthError("No se pudo inicializar la clínica del usuario.");
                    return;
                }

                // Re-fetch para asegurarnos que todo está en orden
                const { data: retryTenantUsers } = await fetchWithTimeout<any>(
                    supabase.rpc('get_my_tenants') as any
                );

                tenantUsers = retryTenantUsers || [{ tenant_id: newTenant.id }];
            }

            // Estrategia de selección del Active Tenant:
            const savedTenantId = localStorage.getItem('turnos_active_tenant');
            const isValidSaved = savedTenantId && tenantUsers.some((t: { tenant_id: string }) => t.tenant_id === savedTenantId);

            if (isValidSaved) {
                setActiveTenantIdState(savedTenantId);
            } else {
                const defaultTenantId = tenantUsers[0].tenant_id;
                setActiveTenantIdState(defaultTenantId);
                localStorage.setItem('turnos_active_tenant', defaultTenantId);
            }
        } catch (e) {
            console.error("loadUserTenants failed completely:", e);
        }
    };

    const setActiveTenantId = (id: string) => {
        setActiveTenantIdState(id);
        localStorage.setItem('turnos_active_tenant', id);
    };

    const isDemoMode = activeTenantId === DEMO_TENANT_ID || user?.email === 'demo@turnos-gestion.local';

    const joinDemo = async () => {
        if (!user) return;
        setLoading(true);
        const { error } = await supabase.rpc('join_demo_tenant');
        if (error) {
            console.error('Error joining demo:', error);
            setLoading(false);
            throw error;
        }
        await loadUserTenants(user.id);
        setActiveTenantIdState(DEMO_TENANT_ID);
        localStorage.setItem('turnos_active_tenant', DEMO_TENANT_ID);
        setLoading(false);
    };

    const signOut = async () => {
        console.log("[AuthContext] Signing out...");
        setActiveTenantIdState(null);
        localStorage.removeItem('turnos_active_tenant');

        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error("Sign out error:", e);
        } finally {
            // Force browser to dump the memory state and reload 
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user,
            loading,
            activeTenantId,
            isDemoMode,
            authError,
            setActiveTenantId,
            joinDemo,
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
