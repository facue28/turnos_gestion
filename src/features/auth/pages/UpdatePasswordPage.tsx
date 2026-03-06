"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordSchema, UpdatePasswordData } from "../types/auth.types";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useTransition } from "react";
import { updatePasswordAction } from "@/app/actions/auth";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
    const [isPending, startTransition] = useTransition();
    const { user, signOut } = useAuth();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<UpdatePasswordData>({
        resolver: zodResolver(updatePasswordSchema),
    });

    const onSubmit = (data: UpdatePasswordData) => {
        startTransition(async () => {
            try {
                const res = await updatePasswordAction(data.password);
                if (res?.success) {
                    toast.success("Contraseña actualizada. Por favor, inicia sesión de nuevo.");
                    // Cerramos sesión también en el cliente por seguridad y redirigimos
                    await signOut();
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error al actualizar contraseña:", error);
                toast.error(error instanceof Error ? error.message : "Error inesperado al guardar la contraseña");
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Asegura tu Cuenta
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Para finalizar tu registro, define una contraseña segura para tu usuario.
                    </p>
                    {user?.email && (
                        <div className="mt-4 px-4 py-2 bg-slate-100 rounded-md inline-block">
                            <span className="text-sm font-medium text-slate-700">{user.email}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
                        <input
                            type="password"
                            {...register("password")}
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Confirmar Contraseña</label>
                        <input
                            type="password"
                            {...register("confirmPassword")}
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-6"
                    >
                        <KeyRound size={18} />
                        {isPending ? "Guardando..." : "Guardar Contraseña"}
                    </button>
                </form>
            </div>
        </div>
    );
}
