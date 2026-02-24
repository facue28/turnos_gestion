"use client";

import { useActionState, useEffect } from "react";
import { updateSettings } from "@/app/actions/settings";
import { useFormStatus } from "react-dom";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
            {pending ? "Guardando..." : "Guardar Cambios"}
        </button>
    );
}

type ProfileData = {
    currency: string;
    default_price: number;
    default_duration: number;
    buffer_between_appointments: number;
};

export default function SettingsForm({ initialData }: { initialData: ProfileData }) {
    const [state, formAction] = useActionState(updateSettings, null);

    return (
        <form action={formAction} className="space-y-4">
            {state?.success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-md text-sm">
                    {state.success}
                </div>
            )}

            {state?.error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
                    {state.error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="currency" className="text-sm font-medium text-slate-700">Moneda (ISO)</label>
                    <input
                        id="currency"
                        name="currency"
                        defaultValue={initialData.currency}
                        required
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        placeholder="EUR"
                    />
                    {state?.fieldErrors?.currency && (
                        <p className="text-xs text-red-600">{state.fieldErrors.currency[0]}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="default_price" className="text-sm font-medium text-slate-700">Precio Default</label>
                    <input
                        id="default_price"
                        name="default_price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={initialData.default_price}
                        required
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    {state?.fieldErrors?.default_price && (
                        <p className="text-xs text-red-600">{state.fieldErrors.default_price[0]}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="default_duration" className="text-sm font-medium text-slate-700">Duración Default (min)</label>
                    <input
                        id="default_duration"
                        name="default_duration"
                        type="number"
                        min="1"
                        defaultValue={initialData.default_duration}
                        required
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    {state?.fieldErrors?.default_duration && (
                        <p className="text-xs text-red-600">{state.fieldErrors.default_duration[0]}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="buffer_between_appointments" className="text-sm font-medium text-slate-700">Buffer entre turnos (min)</label>
                    <input
                        id="buffer_between_appointments"
                        name="buffer_between_appointments"
                        type="number"
                        min="0"
                        defaultValue={initialData.buffer_between_appointments}
                        required
                        className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    {state?.fieldErrors?.buffer_between_appointments && (
                        <p className="text-xs text-red-600">{state.fieldErrors.buffer_between_appointments[0]}</p>
                    )}
                </div>
            </div>

            <div className="pt-2">
                <SubmitButton />
            </div>
        </form>
    );
}
