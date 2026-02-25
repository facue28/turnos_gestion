import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useAvailability, useReplaceAvailability } from "../hooks/useSettings";
import { Trash2, Copy, Plus, Clock, Save } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const SHORT_DAYS = ["D", "L", "M", "X", "J", "V", "S"];
// Lunes a Domingo visual order: 1, 2, 3, 4, 5, 6, 0
const displayOrder = [1, 2, 3, 4, 5, 6, 0];

const timeBlockSchema = z.object({
    weekday: z.number(),
    start_time: z.string().min(5),
    end_time: z.string().min(5),
}).refine(data => data.start_time < data.end_time, {
    message: "La hora de inicio debe ser anterior a la de fin",
    path: ["end_time"]
});

const availabilityFormSchema = z.object({
    activeDays: z.array(z.string()),
    blocks: z.array(timeBlockSchema)
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function AvailabilityEditor() {
    const { activeTenantId, isDemoMode, user } = useAuth();
    const { data: dbAvailabilities, isLoading } = useAvailability(activeTenantId);
    const { mutateAsync: replaceAvailabilityAsync, isPending: isSaving } = useReplaceAvailability(activeTenantId);

    const [hasSmartLoaded, setHasSmartLoaded] = useState(false);
    const [newSlotInputs, setNewSlotInputs] = useState<Record<number, { start: string, end: string }>>({});

    const form = useForm<AvailabilityFormValues>({
        resolver: zodResolver(availabilityFormSchema),
        defaultValues: {
            activeDays: [],
            blocks: []
        },
        mode: "onChange"
    });

    const { control, handleSubmit, watch, setValue, reset, formState: { isDirty } } = form;
    const { append, remove } = useFieldArray({
        control,
        name: "blocks"
    });

    const activeDays = watch("activeDays");
    const blocks = watch("blocks");

    // Smart Load: Initialize form state from DB
    useEffect(() => {
        if (!isLoading && !hasSmartLoaded) {
            if (dbAvailabilities && dbAvailabilities.length > 0) {
                const dbActiveDays = Array.from(new Set(dbAvailabilities.map(a => String(a.weekday))));
                reset({
                    activeDays: dbActiveDays,
                    blocks: dbAvailabilities.map(a => ({
                        weekday: a.weekday,
                        start_time: a.start_time.slice(0, 5),
                        end_time: a.end_time.slice(0, 5)
                    }))
                });
            } else {
                reset({
                    activeDays: ["1", "2", "3", "4", "5"],
                    blocks: []
                });
            }
            setHasSmartLoaded(true);
        }
    }, [isLoading, dbAvailabilities, hasSmartLoaded, reset]);

    const handleAddBlock = (dayId: number) => {
        const inputs = newSlotInputs[dayId] || { start: "", end: "" };
        const start_time = inputs.start;
        const end_time = inputs.end;

        if (!start_time || !start_time.trim() || !end_time || !end_time.trim()) {
            toast.error("Debe ingresar hora de inicio y fin");
            return;
        }

        if (start_time >= end_time) {
            toast.error("La hora de inicio debe ser anterior a la de fin");
            return;
        }

        // Verify it doesn't overlap exactly (optional basic validation)
        const dayBlocks = blocks.filter(b => b.weekday === dayId);
        if (dayBlocks.some(b => b.start_time === start_time && b.end_time === end_time)) {
            toast.error("Ya existe este mismo rango horario para este día");
            return;
        }

        append({ weekday: dayId, start_time, end_time });

        // Reset inputs for this day to empty state
        setNewSlotInputs(prev => ({
            ...prev,
            [dayId]: { start: "", end: "" }
        }));
    };

    const handleDeleteBlock = (indexToDelete: number) => {
        remove(indexToDelete);
    };

    // Magic Copy: Replica los horarios del día elegido a TODOS los demás días "Activos" (seleccionados en el toggle)
    const applyToAllActive = (sourceDayId: number) => {
        const sourceHours = blocks.filter(b => b.weekday === sourceDayId);
        if (sourceHours.length === 0) {
            toast.error("No hay horarios en este día para copiar.");
            return;
        }

        const targetDays = activeDays.map(Number).filter(d => d !== sourceDayId);
        if (targetDays.length === 0) {
            toast.error("No hay otros días activos para copiar.");
            return;
        }

        if (!confirm(`¿Copiar la configuración del ${WEEKDAYS[sourceDayId]} a los otros días activos? Esto reemplazará los horarios de esos días.`)) {
            return;
        }

        // Filtramos eliminando los bloques de los días destino
        const newBlocks = blocks.filter(b => !targetDays.includes(b.weekday));

        // Agregamos los copiados
        for (const tDay of targetDays) {
            for (const h of sourceHours) {
                newBlocks.push({
                    weekday: tDay,
                    start_time: h.start_time,
                    end_time: h.end_time
                });
            }
        }

        setValue("blocks", newBlocks, { shouldDirty: true, shouldValidate: true });
        toast.success("Horarios copiados localmente. ¡Recuerda guardar los cambios!");
    };

    const onSubmit = async (data: AvailabilityFormValues) => {
        if (!user) {
            toast.error("Error de sesión: Usuario no identificado");
            return;
        }

        try {
            // Clean up blocks: only save blocks for activeDays
            const finalBlocks = data.blocks.filter(b => data.activeDays.includes(String(b.weekday)));

            await replaceAvailabilityAsync({ professionalId: user.id, data: finalBlocks });

            // Si el backend guardó con éxito, sincronizamos el formulario local para quitar el isDirty
            reset({
                activeDays: data.activeDays,
                blocks: finalBlocks
            });

        } catch (error: any) {
            toast.error("Error al guardar: " + (error?.message || "Error desconocido"));
            console.error(error);
        }
    };

    if (isLoading || !hasSmartLoaded) {
        return <div className="animate-pulse text-sm text-slate-500 py-10 text-center">Cargando grilla de disponibilidad...</div>;
    }

    // Obtener los días que debemos renderizar (ordenados según displayOrder)
    const visibleDays = displayOrder.filter(d => activeDays.includes(String(d)));

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">Horarios de Atención</h3>
                    <p className="text-sm text-slate-500">Configura tus turnos por día. Soporta franjas partidas.</p>
                </div>
                <Button
                    type="submit"
                    disabled={isSaving || !isDirty || !activeTenantId}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>

            {isDemoMode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm font-medium">
                    Estás editando la configuración de la Clínica Demo. Todos pueden ver estos cambios.
                </div>
            )}

            {/* Días de la semana Selector (Toggles) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Días Laborables</h3>
                    <p className="text-xs text-slate-500 mt-1">Selecciona qué días de la semana atiendes pacientes.</p>
                </div>

                <ToggleGroup
                    type="multiple"
                    value={activeDays}
                    onValueChange={(val: string[]) => {
                        // Impedimos que se queden sin ningún día
                        if (val.length > 0) {
                            setValue("activeDays", val, { shouldDirty: true, shouldValidate: true });
                        }
                    }}
                    className="bg-white border rounded-lg p-1 justify-start md:justify-center overflow-x-auto"
                >
                    {displayOrder.map(d => (
                        <ToggleGroupItem
                            key={d}
                            value={String(d)}
                            aria-label={`Toggle ${WEEKDAYS[d]}`}
                            className="h-10 w-10 sm:w-12 rounded-md font-medium data-[state=on]:bg-indigo-600 data-[state=on]:text-white transition-all text-sm"
                        >
                            {SHORT_DAYS[d]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            {/* Listado de Días Activos (Cards) */}
            <div className="space-y-4">
                {visibleDays.map((d) => {
                    // Find blocks for this day from our flat array in RHF state
                    const dayBlocksList = blocks
                        .map((b, idx) => ({ ...b, originalIndex: idx }))
                        .filter(b => b.weekday === d)
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));

                    return (
                        <div key={d} className="bg-white border shadow-sm rounded-xl overflow-hidden transition-all hover:shadow-md animate-in fade-in zoom-in-95 duration-200">
                            {/* Cabecera del día */}
                            <div className="bg-slate-50 border-b px-5 py-3 flex flex-row items-center justify-between">
                                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    {WEEKDAYS[d]}
                                </h4>

                                {dayBlocksList.length > 0 && activeDays.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-slate-500 hover:text-indigo-600 h-8"
                                        onClick={() => applyToAllActive(d)}
                                        disabled={isSaving}
                                        title="Copiar estos horarios al resto de los días seleccionados arriba"
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1" />
                                        Copiar al resto
                                    </Button>
                                )}
                            </div>

                            <div className="p-5 flex flex-col md:flex-row gap-6 md:items-center items-stretch justify-between">

                                {/* Lista de horarios configurados */}
                                <div className="flex-1 space-y-2">
                                    {dayBlocksList.length === 0 ? (
                                        <div className="text-sm text-slate-400 italic py-2 border-l-2 border-transparent">
                                            Sin horarios asignados para este día.
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-3">
                                            {dayBlocksList.map(item => (
                                                <div key={item.originalIndex} className="group flex items-center gap-2 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100/50 pl-4 pr-2 py-2 rounded-full w-fit transition-all">
                                                    <span className="text-sm font-semibold text-indigo-900 tracking-tight">
                                                        {item.start_time} - {item.end_time}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isSaving}
                                                        onClick={() => handleDeleteBlock(item.originalIndex)}
                                                        className="p-1.5 text-indigo-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all disabled:opacity-50"
                                                        title="Eliminar franja"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Formulario Inline falso para agregar un rango localmente */}
                                <div className="flex items-center gap-3 md:w-auto w-full md:border-l md:pl-6 border-slate-100 pt-4 md:pt-0 border-t md:border-t-0 shrink-0">
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                                            <input
                                                type="time"
                                                id={`start_time_${d}`}
                                                className="px-1 py-1.5 text-sm font-medium text-slate-700 bg-transparent w-24 outline-none"
                                                value={newSlotInputs[d]?.start ?? ""}
                                                onChange={(e) => setNewSlotInputs(prev => ({ ...prev, [d]: { ...prev[d], start: e.target.value, end: prev[d]?.end ?? "" } }))}
                                            />
                                        </div>

                                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">a</span>

                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                                            <input
                                                type="time"
                                                id={`end_time_${d}`}
                                                className="px-1 py-1.5 text-sm font-medium text-slate-700 bg-transparent w-24 outline-none"
                                                value={newSlotInputs[d]?.end ?? ""}
                                                onChange={(e) => setNewSlotInputs(prev => ({ ...prev, [d]: { ...prev[d], end: e.target.value, start: prev[d]?.start ?? "" } }))}
                                            />
                                        </div>

                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            disabled={isSaving || !activeTenantId}
                                            onClick={() => handleAddBlock(d)}
                                            className="h-10 w-10 shrink-0 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 shadow-sm border border-indigo-100/50 rounded-lg transition-all"
                                            title="Añadir franja horaria local"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-xs text-slate-400 text-center pt-4">
                Los cambios permanecen locales hasta que pulses "Guardar Cambios".
            </div>
        </form>
    );
}
