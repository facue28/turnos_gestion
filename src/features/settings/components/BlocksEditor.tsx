import { useState, useRef } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useBlocks, useAddBlock, useDeleteBlock, useEditBlock } from "../hooks/useSettings";
import { Trash2, CalendarOff, Clock, Edit2 } from "lucide-react";
import { format, setHours, setMinutes, setSeconds, parse, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BlockData } from "../types/settings.types";

// Generate time options (e.g. 09:00, 09:30, 10:00)
const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 30) {
            options.push(`${i.toString().padStart(2, '0')}:${j.toString().padStart(2, '0')}`);
        }
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

export default function BlocksEditor() {
    const { activeTenantId, isDemoMode, user } = useAuth();
    const { data: blocks, isLoading } = useBlocks(activeTenantId);
    const { mutate: addBlock, isPending: isAdding } = useAddBlock(activeTenantId);
    const { mutate: editBlock, isPending: isEditing } = useEditBlock(activeTenantId);
    const { mutate: deleteBlock, isPending: isDeleting } = useDeleteBlock(activeTenantId);

    const formRef = useRef<HTMLFormElement>(null);

    // Form State
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");
    const [reason, setReason] = useState("");

    const isSaving = isAdding || isEditing;
    const isWorking = isSaving || isDeleting;

    const resetForm = () => {
        setEditingBlockId(null);
        setDateRange(undefined);
        setIsAllDay(true);
        setStartTime("09:00");
        setEndTime("18:00");
        setReason("");
    };

    const handleEditClick = (block: BlockData) => {
        const start = new Date(block.start_at);
        const end = new Date(block.end_at);

        const blockIsAllDay = start.getHours() === 0 && start.getMinutes() === 0 &&
            end.getHours() === 23 && end.getMinutes() === 59;

        setEditingBlockId(block.id);
        setDateRange({ from: start, to: end });
        setIsAllDay(blockIsAllDay);
        setReason(block.reason || "");

        if (!blockIsAllDay) {
            setStartTime(format(start, "HH:mm"));
            setEndTime(format(end, "HH:mm"));
        }

        // Scroll to form smoothly
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!dateRange?.from) {
            toast.error("Debes seleccionar al menos un día de inicio.");
            return;
        }

        let finalStart = dateRange.from;
        let finalEnd = dateRange.to || dateRange.from;

        if (isAllDay) {
            finalStart = startOfDay(finalStart);
            finalEnd = endOfDay(finalEnd);
        } else {
            const startParsed = parse(startTime, "HH:mm", new Date());
            finalStart = setSeconds(setMinutes(setHours(finalStart, startParsed.getHours()), startParsed.getMinutes()), 0);

            const endParsed = parse(endTime, "HH:mm", new Date());
            finalEnd = setSeconds(setMinutes(setHours(finalEnd, endParsed.getHours()), endParsed.getMinutes()), 0);
        }

        if (!user?.id) {
            toast.error("Error de sesión: Usuario no identificado.");
            return;
        }

        if (finalStart >= finalEnd) {
            toast.error("La fecha/hora de inicio debe ser anterior a la de fin.");
            return;
        }

        const payload = {
            start_at: finalStart.toISOString(),
            end_at: finalEnd.toISOString(),
            reason: reason.trim() || undefined,
            professional_id: user.id
        };

        if (editingBlockId) {
            editBlock(
                { id: editingBlockId, data: payload },
                {
                    onSuccess: () => {
                        resetForm();
                    }
                }
            );
        } else {
            addBlock(
                payload,
                {
                    onSuccess: () => {
                        resetForm();
                    }
                }
            );
        }
    };

    if (isLoading) {
        return <div className="animate-pulse text-sm text-slate-500 py-10 text-center">Cargando grilla de excepciones...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Excepciones y Bloqueos</h3>
                    <p className="text-sm text-slate-500">Configura días libres, vacaciones o franjas bloqueadas.</p>
                </div>
            </div>

            {isDemoMode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm font-medium">
                    Estás editando la configuración de la Clínica Demo. Todos pueden ver estos cambios.
                </div>
            )}

            {/* Nuevo Formulario Rediseñado */}
            <form ref={formRef} onSubmit={handleSave} className={`border rounded-xl p-5 space-y-5 transition-all duration-300 ${editingBlockId ? 'bg-indigo-50/50 border-indigo-200 shadow-md' : 'bg-slate-50 border-slate-200'}`}>
                {editingBlockId && (
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100">
                        <span className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                            <Edit2 className="w-4 h-4" />
                            Editando Bloqueo
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="h-8 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800">
                            Cancelar Edición
                        </Button>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

                    {/* Date Selector */}
                    <div className="lg:col-span-5 space-y-2">
                        <label className="text-sm font-semibold text-slate-900">Rango de Días</label>
                        <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full bg-white" />
                    </div>

                    {/* All Day Toggle */}
                    <div className="lg:col-span-2 flex flex-col justify-center space-y-3 pb-1">
                        <label className="text-sm font-medium text-slate-700">Todo el día</label>
                        <Switch
                            checked={isAllDay}
                            onCheckedChange={setIsAllDay}
                            aria-label="Toggle todo el día"
                        />
                    </div>

                    {/* Time Selectors (Only if !isAllDay) */}
                    {!isAllDay && (
                        <div className="lg:col-span-5 flex items-center gap-3">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-slate-700">Desde</label>
                                <Select value={startTime} onValueChange={setStartTime}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Hora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(time => (
                                            <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-slate-700">Hasta</label>
                                <Select value={endTime} onValueChange={setEndTime}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Hora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_OPTIONS.map(time => (
                                            <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
                    <div className="lg:col-span-9 space-y-2">
                        <label className="text-sm font-medium text-slate-700">Motivo (Opcional)</label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Vacaciones, Feriado..."
                            className="bg-white"
                        />
                    </div>
                    <div className="lg:col-span-3">
                        <Button
                            type="submit"
                            disabled={isSaving || !activeTenantId || !dateRange?.from}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            {isSaving ? "Guardando..." : editingBlockId ? "Guardar Cambios" : "Bloquear Fechas"}
                        </Button>
                    </div>
                </div>
            </form>

            <div className="space-y-3 pt-2">
                <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Bloqueos Activos</h4>

                {blocks && blocks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {blocks.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()).map(block => {
                            const start = new Date(block.start_at);
                            const end = new Date(block.end_at);

                            // Si empieza a las 00:00 y termina a las 23:59 consideramos que es todo el día
                            const isBlockAllDay = start.getHours() === 0 && start.getMinutes() === 0 &&
                                end.getHours() === 23 && end.getMinutes() === 59;

                            // Si empieza y termina el mismo dia
                            const isSameDay = start.toDateString() === end.toDateString();

                            return (
                                <div key={block.id} className="group relative bg-white border border-slate-200 shadow-sm rounded-xl p-4 transition-all hover:shadow-md hover:border-indigo-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div className="inline-flex items-center justify-center p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                            {isBlockAllDay ? <CalendarOff size={18} /> : <Clock size={18} />}
                                        </div>
                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-100">
                                            <button
                                                type="button"
                                                disabled={isWorking}
                                                onClick={() => handleEditClick(block)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-l-md transition-colors disabled:opacity-50"
                                                title="Editar bloqueo"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <div className="w-px h-4 bg-slate-200"></div>
                                            <button
                                                type="button"
                                                disabled={isWorking}
                                                onClick={() => {
                                                    if (confirm("¿Estás seguro de eliminar este bloqueo?")) {
                                                        deleteBlock(block.id);
                                                    }
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-r-md transition-colors disabled:opacity-50"
                                                title="Eliminar bloqueo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        {block.reason ? (
                                            <h5 className="font-semibold text-slate-800 text-sm mb-1">{block.reason}</h5>
                                        ) : (
                                            <h5 className="font-semibold text-slate-800 text-sm mb-1 italic">Bloqueo sin motivo</h5>
                                        )}

                                        <div className="text-xs text-slate-500 font-medium">
                                            {isSameDay ? (
                                                <>
                                                    <span className="capitalize">{format(start, "EEEE d 'de' MMM", { locale: es })}</span>
                                                    {!isBlockAllDay && <span className="block mt-0.5 text-indigo-600">{format(start, "HH:mm")} - {format(end, "HH:mm")}</span>}
                                                </>
                                            ) : (
                                                <div className="flex flex-col gap-0.5">
                                                    <span>De: <span className="capitalize">{format(start, "EEE d MMM", { locale: es })} {isBlockAllDay ? "" : format(start, "HH:mm")}</span></span>
                                                    <span>A: <span className="capitalize">{format(end, "EEE d MMM", { locale: es })} {isBlockAllDay ? "" : format(end, "HH:mm")}</span></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                        No hay bloqueos futuros configurados.
                    </div>
                )}
            </div>
        </div>
    );
}
