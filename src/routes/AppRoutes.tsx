import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

import { Navigation } from '@/components/Navigation';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import LoginPage from '@/features/auth/pages/LoginPage';
import PatientsPage from '@/features/patients/pages/PatientsPage';
import CalendarView from '@/features/calendar/components/CalendarView';

// Main Layout wrapping Navigation and Outlet
const DashboardLayout = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Navigation includes both Desktop Sidebar and Mobile Bottom Bar */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 w-full md:pl-64">
            <div className="p-4 md:p-8 h-full">
                <Outlet />
            </div>
        </main>
    </div>
);

// Protected Route Guard
const PrivateRoute = () => {
    const { session, loading, authError } = useAuth();

    if (authError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm max-w-md text-center">
                    <h2 className="text-red-600 font-bold mb-2">Error de Autenticación Crítico</h2>
                    <p className="text-slate-600 mb-4">{authError}</p>
                    <button onClick={() => window.location.href = '/login'} className="bg-slate-900 text-white px-4 py-2 rounded-md">
                        Volver al Login
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <DashboardLayout />;
};

// Pages Placeholders
const DashboardHome = () => <div className="p-8">Dashboard Home (Protegida)</div>;

export function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Rutas Públicas */}
                <Route path="/login" element={<LoginPage />} />

                {/* Rutas Protegidas */}
                <Route path="/" element={<PrivateRoute />}>
                    <Route index element={<Navigate to="/calendario" replace />} />
                    <Route path="calendario" element={<CalendarView />} />
                    <Route path="hoy" element={<DashboardHome />} />
                    <Route path="pacientes" element={<PatientsPage />} />
                    <Route path="ajustes" element={<SettingsPage />} />
                    {/* Se agregarán más rutas anidadas aquí (caja) */}
                </Route>

                {/* Catch-all 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
