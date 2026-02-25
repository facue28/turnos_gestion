import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { settingsSchema, SettingsFormData } from "../types/settings.types";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useAuth } from "@/features/auth/context/AuthContext";
import { NumberInput } from "@/components/ui/number-input";

export default function SettingsForm() {
    const { activeTenantId } = useAuth();
    const { data: profile, isLoading } = useSettings(activeTenantId);
    const { mutate: updateSettings, isPending } = useUpdateSettings(activeTenantId);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema) as any,
    });

    // Populate form when data arrives
    useEffect(() => {
        if (profile) {
            reset({
                currency: profile.currency,
                default_price: profile.default_price,
                default_duration: profile.default_duration,
                buffer_between_appointments: profile.buffer_between_appointments,
            });
        }
    }, [profile, reset]);

    const onSubmit = (data: SettingsFormData) => {
        if (!activeTenantId) return;
        updateSettings(data);
    };

    if (isLoading) {
        return <div className="text-sm text-slate-500 animate-pulse">Cargando configuración...</div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Currency */}
                <div className="space-y-2">
                    <label htmlFor="currency" className="text-sm font-medium text-slate-700">
                        Moneda (ISO)
                    </label>
                    <input
                        id="currency"
                        {...register("currency")}
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        placeholder="EUR"
                    />
                    {errors.currency && (
                        <p className="text-xs text-red-600">{errors.currency.message}</p>
                    )}
                </div>

                {/* Default Price */}
                <div className="space-y-2">
                    <label htmlFor="default_price" className="text-sm font-medium text-slate-700">
                        Precio Default
                    </label>
                    <NumberInput
                        id="default_price"
                        step="0.01"
                        {...register("default_price")}
                        className="w-full"
                    />
                    {errors.default_price && (
                        <p className="text-xs text-red-600">{errors.default_price.message}</p>
                    )}
                </div>

                {/* Default Duration */}
                <div className="space-y-2">
                    <label htmlFor="default_duration" className="text-sm font-medium text-slate-700">
                        Duración Default (min)
                    </label>
                    <NumberInput
                        id="default_duration"
                        {...register("default_duration")}
                        className="w-full"
                    />
                    {errors.default_duration && (
                        <p className="text-xs text-red-600">{errors.default_duration.message}</p>
                    )}
                </div>

                {/* Buffer Between Appointments */}
                <div className="space-y-2">
                    <label htmlFor="buffer_between_appointments" className="text-sm font-medium text-slate-700">
                        Buffer entre turnos (min)
                    </label>
                    <NumberInput
                        id="buffer_between_appointments"
                        {...register("buffer_between_appointments")}
                        className="w-full"
                    />
                    {errors.buffer_between_appointments && (
                        <p className="text-xs text-red-600">{errors.buffer_between_appointments.message}</p>
                    )}
                </div>
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || isPending || !activeTenantId}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {(isSubmitting || isPending) ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </form>
    );
}
