import SettingsForm from "../components/SettingsForm";
import AvailabilityEditor from "../components/AvailabilityEditor";
import BlocksEditor from "../components/BlocksEditor";
import { useAuth } from "@/features/auth/context/AuthContext";

export default function SettingsPage() {
    const { activeTenantId, signOut } = useAuth();

    if (!activeTenantId) {
        return (
            <div className="p-8 flex flex-col items-center justify-center space-y-4 text-center">
                <p className="text-slate-500">Seleccionando clínica...</p>
                <button
                    onClick={() => signOut()}
                    className="text-sm text-red-500 hover:text-red-700 underline underline-offset-4"
                >
                    ¿Atascado? Forzar cierre de sesión
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ajustes</h1>
                <p className="text-slate-500 mt-2">
                    Gestiona la configuración base, tus horarios de atención y bloqueos excepcionales.
                </p>
            </div>

            <div className="grid gap-8">
                {/* Bloque: Configuración Base */}
                <section className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuración Base</h2>
                    <SettingsForm />
                </section>

                {/* Bloque: Disponibilidad Semanal */}
                <section className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Disponibilidad Semanal</h2>
                        <p className="text-sm text-slate-500">
                            Define los rangos horarios en los que regularmente atiendes pacientes.
                        </p>
                    </div>
                    <AvailabilityEditor />
                </section>

                {/* Bloque: Excepciones y Bloqueos */}
                <section className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Excepciones y Bloqueos</h2>
                        <p className="text-sm text-slate-500">
                            Agrega fechas o rangos específicos donde no estarás disponible (ej: Vacaciones, Feriados).
                        </p>
                    </div>
                    <BlocksEditor />
                </section>
            </div>
        </div>
    );
}
