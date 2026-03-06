"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Building2, UserCircle2, Stethoscope, Sparkles } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        fullName: "",
        profession: "",
        clinicName: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await completeOnboarding(formData);
            if (result?.success) {
                // Usamos window.location para forzar una recarga limpia al estado de "logueado"
                // y limpiamos el middleware interno de la sesión caché
                window.location.href = "/ajustes";
                return; // Cortocircuito para que isLoading siga en true mientras navega
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
            <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Logo / Header decorativo */}
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100 mb-2">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        ¡Bienvenido a Agenda<span className="text-indigo-600">+Caja</span>!
                    </h1>
                    <p className="text-slate-500">
                        Configura tu espacio de trabajo profesional en segundos.
                    </p>
                </div>

                <Card className="shadow-2xl shadow-slate-200 border-none">
                    <CardHeader>
                        <CardTitle className="text-xl">Datos de Identidad</CardTitle>
                        <CardDescription>
                            Estos datos serán visibles para tus pacientes y en tus reportes.
                        </CardDescription>
                    </CardHeader>

                    <form onSubmit={handleSubmit}>
                        <CardContent className="space-y-5">
                            {/* Nombre Administrativo/Real */}
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="flex items-center gap-2">
                                    <UserCircle2 className="w-4 h-4 text-indigo-500" />
                                    ¿Cómo te llamas?
                                </Label>
                                <Input
                                    id="fullName"
                                    placeholder="Ej: Lic. Marcos Paz"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="focus-visible:ring-indigo-500"
                                />
                            </div>

                            {/* Especialidad */}
                            <div className="space-y-2">
                                <Label htmlFor="profession" className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-indigo-500" />
                                    Tu Especialidad / Profesión
                                </Label>
                                <Input
                                    id="profession"
                                    placeholder="Ej: Psicólogo, Kinesióloga..."
                                    required
                                    value={formData.profession}
                                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                                    className="focus-visible:ring-indigo-500"
                                />
                            </div>

                            {/* Nombre de la Clínica */}
                            <div className="space-y-2 pt-2">
                                <Label htmlFor="clinicName" className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    Nombre de tu Consultorio / Clínica
                                </Label>
                                <Input
                                    id="clinicName"
                                    placeholder="Ej: Centro de Rehabilitación Paz"
                                    required
                                    value={formData.clinicName}
                                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                                    className="focus-visible:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400">
                                    Podrás cambiar esto más adelante en ajustes.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium animate-in fade-in duration-300">
                                    {error}
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="pb-8 overflow-hidden">
                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-md font-semibold transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-100 py-6"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Personalizando tu entorno...
                                    </div>
                                ) : (
                                    "Comenzar mi Práctica"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="mt-8 text-center text-xs text-slate-400">
                    Al comenzar, aceptas los términos de servicio y políticas de privacidad.
                </p>
            </div>
        </div>
    );
}
