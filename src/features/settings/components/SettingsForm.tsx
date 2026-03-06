"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { settingsSchema, SettingsFormData } from "../types/settings.types";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useAuth } from "@/features/auth/context/AuthContext";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Controller } from "react-hook-form";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsForm() {
    const { user } = useAuth();
    const professionalId = user?.id || null;
    const { data: profile, isLoading } = useSettings(professionalId);
    const { mutate: updateSettings, isPending } = useUpdateSettings(professionalId);

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting, isDirty },
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
                charge_no_shows: profile.charge_no_shows ?? true,
                full_name: profile.full_name || "",
                profession: profile.profession || "",
            });
        }
    }, [profile, reset]);

    const onSubmit = (data: SettingsFormData) => {
        if (!professionalId) return;
        updateSettings(data);
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    if (isLoading) {
        return <div className="text-sm text-slate-500 animate-pulse">Cargando configuración...</div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">

                {/* Nombre Completo */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
                        Nombre Completo
                    </label>
                    <input
                        id="full_name"
                        type="text"
                        {...register("full_name")}
                        placeholder="Ej. Dr. Juan Pérez"
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isPending || isSubmitting}
                    />
                    {errors.full_name && (
                        <p className="text-xs text-red-600">{errors.full_name.message}</p>
                    )}
                </div>

                {/* Profesión */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                    <label htmlFor="profession" className="text-sm font-medium text-slate-700">
                        Profesión / Título visible
                    </label>
                    <input
                        id="profession"
                        type="text"
                        {...register("profession")}
                        placeholder="Ej. Psicólogo, Odontóloga..."
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isPending || isSubmitting}
                    />
                    {errors.profession && (
                        <p className="text-xs text-red-600">{errors.profession.message}</p>
                    )}
                </div>

                {/* Currency */}
                <div className="space-y-2">
                    <label htmlFor="currency" className="text-sm font-medium text-slate-700">
                        Moneda Base
                    </label>
                    <select
                        id="currency"
                        {...register("currency")}
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500 bg-white"
                        disabled={isPending || isSubmitting}
                    >
                        <option value="ARS">ARS$ (Pesos Argentinos)</option>
                        <option value="USD">US$ (Dólares)</option>
                        <option value="EUR">EUR€ (Euros)</option>
                    </select>
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

            {/* Política de Inasistencias */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 px-4 bg-slate-50/50 rounded-lg">
                <div className="space-y-0.5 max-w-[80%]">
                    <label className="text-sm font-medium text-slate-900">
                        Cobrar Inasistencias
                    </label>
                    <p className="text-[13px] text-slate-500">
                        Si está activo, los turnos marcados como "No asistió" generarán deuda en el balance del paciente para futuras cobranzas.
                    </p>
                </div>
                <Controller
                    control={control}
                    name="charge_no_shows"
                    render={({ field }) => (
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                        />
                    )}
                />
            </div>

            <div className="pt-4 flex justify-end">
                <Button
                    type="submit"
                    disabled={isSubmitting || isPending || !professionalId || !isDirty}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {(isSubmitting || isPending) ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>
        </form>
    );
}
