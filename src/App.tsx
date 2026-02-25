import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { AppRoutes } from '@/routes/AppRoutes';
import { Toaster } from 'sonner';

export default function App() {
    return (
        // 1. React Query Provider for data fetching
        <QueryClientProvider client={queryClient}>

            {/* 2. Auth Provider for Supabase Session Management */}
            <AuthProvider>

                {/* 3. React Router App Routing Logic */}
                <AppRoutes />

                {/* 4. Global UI Components (Toasts) */}
                <Toaster position="bottom-right" richColors />

            </AuthProvider>

        </QueryClientProvider>
    );
}
