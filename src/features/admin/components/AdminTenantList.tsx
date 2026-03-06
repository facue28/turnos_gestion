"use client";

import { useState, useTransition } from "react";
import { inviteProfessional, revokeInvitation } from "@/app/actions/admin";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Clock, Mail, ShieldX, UserPlus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TenantData {
    id: string;
    email?: string;
    isConfirmed: boolean;
    lastSignIn?: string;
    createdAt: string;
    profile: {
        id: string;
        full_name: string | null;
        profession: string | null;
        tenant_id: string;
    } | null;
    tenant: {
        id: string;
        name: string;
    } | null;
}

export function AdminTenantList({ initialTenants }: { initialTenants: TenantData[] }) {
    const [email, setEmail] = useState("");
    const [isPending, startTransition] = useTransition();
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setSuccessMsg("");

        if (!email) return;

        startTransition(async () => {
            const result = await inviteProfessional(email);
            if (result.success) {
                setSuccessMsg(`Invitación enviada exitosamente a ${email}`);
                setEmail("");
            } else {
                setErrorMsg(result.error || "Ocurrió un error al enviar la invitación.");
            }
        });
    };

    const handleRevoke = async (userId: string) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta cuenta y todos los datos de su clínica (tenant)? Esta acción no se puede deshacer.")) {
            return;
        }

        startTransition(async () => {
            const result = await revokeInvitation(userId);
            if (result.success) {
                setSuccessMsg("Cuenta eliminada correctamente.");
            } else {
                setErrorMsg(result.error || "Error al eliminar la cuenta.");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Formulario de Invitación */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-500" />
                    Invitar Nuevo Profesional
                </h3>

                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="correo@doctor.com"
                            className="w-full pl-10 pr-4 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isPending || !email}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
                    >
                        {isPending ? "Enviando..." : "Enviar Invitación"}
                    </Button>
                </form>

                {errorMsg && <p className="mt-3 text-sm text-red-600">{errorMsg}</p>}
                {successMsg && <p className="mt-3 text-sm text-emerald-600 font-medium">{successMsg}</p>}
            </div>

            {/* Tabla de Clientes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-medium">Clínica / Usuario</th>
                                <th className="px-6 py-4 font-medium">Estado</th>
                                <th className="px-6 py-4 font-medium">Última Actividad</th>
                                <th className="px-6 py-4 font-medium text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {initialTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No hay usuarios registrados aún en la plataforma.
                                    </td>
                                </tr>
                            ) : (
                                initialTenants.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-indigo-50 p-2 rounded-lg mt-1">
                                                    <Building2 className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {user.profile?.full_name || "Módulo Médico Base"}
                                                    </p>
                                                    <p className="text-slate-500 text-xs mt-0.5">{user.email}</p>
                                                    <p className="text-slate-400 text-xs mt-0.5">
                                                        Tenant: {user.tenant?.name || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isConfirmed ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Invitación Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {user.lastSignIn
                                                ? format(new Date(user.lastSignIn), "d MMM yyyy, HH:mm", { locale: es })
                                                : "Nunca ingresó"
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleRevoke(user.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                                            >
                                                <ShieldX className="w-3.5 h-3.5" />
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
