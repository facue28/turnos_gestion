"use client";

import { addBlock, deleteBlock } from "@/app/actions/blocks";
import { useFormStatus } from "react-dom";
import { Trash2, AlertCircle } from "lucide-react";
import { useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Block = {
    id: string;
    start_at: string;
    end_at: string;
    reason: string | null;
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 text-white px-3 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
            {pending ? "Guardando..." : "Crear Bloqueo"}
        </button>
    );
}

function DeleteButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
        >
            <Trash2 size={16} />
        </button>
    );
}

export default function BlocksEditor({ data }: { data: Block[] }) {
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleAdd(formData: FormData) {
        setError(null);
        const result = await addBlock(formData);
        if (result?.error) {
            setError(result.error);
        } else {
            formRef.current?.reset();
        }
    }

    // Ordenar de más próximo a más lejano
    const sortedBlocks = [...data].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    );

    return (
        <div className="space-y-6">

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Agregar Bloqueo Form */}
            <form ref={formRef} action={handleAdd} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-medium text-slate-500">Inicio</label>
                    <input type="datetime-local" name="start_at" className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" required />
                </div>
                <div className="space-y-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-medium text-slate-500">Fin</label>
                    <input type="datetime-local" name="end_at" className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" required />
                </div>
                <div className="space-y-1 w-full md:w-auto flex-[1.5]">
                    <label className="text-xs font-medium text-slate-500">Motivo (opcional)</label>
                    <input type="text" name="reason" placeholder="Vacaciones, feriado..." className="w-full px-3 py-2 border rounded-md text-slate-900 bg-white" />
                </div>
                <div className="w-full md:w-auto mt-2 md:mt-0">
                    <SubmitButton />
                </div>
            </form>

            {/* Lista de bloqueos */}
            <div className="space-y-3">
                {sortedBlocks.map(block => (
                    <div key={block.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="pt-1 text-slate-400">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">
                                    {block.reason || "Bloqueo sin motivo explícito"}
                                </h4>
                                <div className="text-sm text-slate-500 mt-0.5">
                                    Desde: <span className="text-slate-700 font-medium">{format(new Date(block.start_at), "dd/MMM/yyyy HH:mm", { locale: es })}</span>
                                    <br className="md:hidden" />
                                    <span className="hidden md:inline"> &bull; </span>
                                    Hasta: <span className="text-slate-700 font-medium">{format(new Date(block.end_at), "dd/MMM/yyyy HH:mm", { locale: es })}</span>
                                </div>
                            </div>
                        </div>
                        <form action={async (fd) => { await deleteBlock(fd); }}>
                            <input type="hidden" name="id" value={block.id} />
                            <DeleteButton />
                        </form>
                    </div>
                ))}

                {sortedBlocks.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No hay ausencias programadas.</p>
                )}
            </div>

        </div>
    );
}
