import { Inter } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Doble validación estricta de seguridad en el servidor (además del Middleware)
    const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

    if (!adminData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Acceso Denegado</h1>
                <p className="text-slate-500 mt-2 text-center max-w-sm mb-6">
                    Esta área está restringida exclusivamente para los administradores de la plataforma SaaS.
                </p>
                <Link href="/hoy" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition">
                    Volver a mi Consultorio
                </Link>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-slate-100 ${inter.className}`}>
            <nav className="bg-slate-900 text-white border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-emerald-400 w-5 h-5" />
                            <span className="font-semibold text-lg tracking-tight">SaaS Central</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm text-slate-400">Panel Súper Admin</span>
                        </div>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
