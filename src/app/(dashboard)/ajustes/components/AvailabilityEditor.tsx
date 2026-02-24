"use client";

import { addAvailability, deleteAvailability } from "@/app/actions/availability";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";

type Availability = {
    id: string;
    weekday: number;
    start_time: string;
    end_time: string;
};

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 text-white px-3 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
            {pending ? "Agregando..." : "Agregar rango"}
        </button>
    );
}

function DeleteButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
        >
            <Trash2 size={16} />
        </button>
    );
}

export default function AvailabilityEditor({ data }: { data: Availability[] }) {
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleAdd(formData: FormData) {
        setError(null);
        const result = await addAvailability(formData);
        if (result?.error) {
            setError(result.error);
        } else {
            formRef.current?.reset();
        }
    }

    // Agrupar por día
    const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.weekday]) acc[curr.weekday] = [];
        acc[curr.weekday].push(curr);
        return acc;
    }, {} as Record<number, Availability[]>);

    // Ordenar días de Lunes (1) a Domingo (0) para UX
    const displayDays = [1, 2, 3, 4, 5, 6, 0];

    return (
        <div className="space-y-6">

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Agregar Rango Form */}
            <form ref={formRef} action={handleAdd} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-medium text-slate-500">Día</label>
                    <select name="weekday" className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" required>
                        {displayDays.map(d => (
                            <option key={d} value={d}>{WEEKDAYS[d]}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-medium text-slate-500">Desde</label>
                    <input type="time" name="start_time" className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" required />
                </div>
                <div className="space-y-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-medium text-slate-500">Hasta</label>
                    <input type="time" name="end_time" className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" required />
                </div>
                <div className="w-full md:w-auto mt-2 md:mt-0">
                    <SubmitButton />
                </div>
            </form>

            {/* Lista de rangos */}
            <div className="space-y-4">
                {displayDays.map(d => {
                    const items = grouped[d] || [];
                    if (items.length === 0) return null;

                    return (
                        <div key={d} className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-3 last:border-0">
                            <div className="w-28 font-medium text-slate-700">{WEEKDAYS[d]}</div>
                            <div className="flex-1 space-y-2">
                                {items.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-md w-fit">
                                        <span className="text-sm font-medium text-indigo-900">
                                            {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                                        </span>
                                        <form action={async (fd) => { await deleteAvailability(fd); }}>
                                            <input type="hidden" name="id" value={item.id} />
                                            <DeleteButton />
                                        </form>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {Object.keys(grouped).length === 0 && (
                    <p className="text-sm text-slate-500 italic">No hay rangos de disponibilidad configurados.</p>
                )}
            </div>

        </div>
    );
}
