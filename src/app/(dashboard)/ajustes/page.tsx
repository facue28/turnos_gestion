import { logout } from "@/app/actions/auth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./components/SettingsForm";
import AvailabilityEditor from "./components/AvailabilityEditor";
import BlocksEditor from "./components/BlocksEditor";

export default async function AjustesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const { data: availability } = await supabase
        .from("weekly_availability")
        .select("*")
        .eq("professional_id", user.id);

    const { data: blocks } = await supabase
        .from("blocks")
        .select("*")
        .eq("professional_id", user.id);

    if (!profile) {
        return <div className="p-6 text-red-600">Error: Perfil no encontrado. Iniciá sesión nuevamente o creá un usuario.</div>;
    }

    return (
        <div className="space-y-6 pb-20 md:pb-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes</h2>
                <p className="text-sm text-slate-500 mt-1">Preferencias y configuración de la cuenta</p>
            </header>

            <div className="grid gap-6">
                <section className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="text-lg font-medium text-slate-900">Valores por defecto</h3>
                    <SettingsForm initialData={{
                        currency: profile.currency || "EUR",
                        default_price: profile.default_price || 0,
                        default_duration: profile.default_duration || 60,
                        buffer_between_appointments: profile.buffer_between_appointments || 0
                    }} />
                </section>

                <section className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="text-lg font-medium text-slate-900">Disponibilidad Semanal</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        Configurá los rangos horarios en los que atendés habitualmente.
                    </p>
                    <AvailabilityEditor data={availability || []} />
                </section>

                <section className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
                    <h3 className="text-lg font-medium text-slate-900">Ausencias y Bloqueos</h3>
                    <p className="text-slate-500 text-sm mb-4">
                        Agregá feriados, vacaciones o excepciones donde no recibirás turnos.
                    </p>
                    <BlocksEditor data={blocks || []} />
                </section>

                <section className="bg-white rounded-xl shadow-sm border p-6 space-y-4 mt-8">
                    <h3 className="text-lg font-medium text-red-600">Sesión</h3>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}
