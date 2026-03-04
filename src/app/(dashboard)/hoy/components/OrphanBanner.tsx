"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateAppointmentStatus } from "@/app/actions/appointments";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CheckCircle2, XCircle, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function OrphanBanner({ orphans }: { orphans: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

    if (!orphans || orphans.length === 0) return null;

    const handleAction = async (id: string, status: 'Realizada' | 'No_asistio' | 'Cancelada') => {
        setLoadingIds(prev => ({ ...prev, [id]: true }));
        try {
            await updateAppointmentStatus(id, status);
            toast.success("Turno clasificado correctamente");

            // Si el Action actualizó la BD, el servidor hará revalidatePath('/hoy') automáticamente 
            // tras la mutación y este banner recibirá los 'orphans' actualizados solos desde el servidor.
        } catch (error: any) {
            toast.error(error.message || "Error al clasificar el turno");
        } finally {
            setLoadingIds(prev => ({ ...prev, [id]: false }));
        }
    };

    return (
        <>
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-200/50 p-2.5 rounded-full shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-semibold text-base mb-0.5">Turnos sin clasificar</h4>
                        <p className="text-amber-700/90 text-sm font-medium">
                            Tienes {orphans.length} {orphans.length === 1 ? 'turno' : 'turnos'} de días anteriores pendiente de resolución.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="bg-white text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0 w-full sm:w-auto shadow-sm"
                    onClick={() => setIsOpen(true)}
                >
                    Revisar ahora
                </Button>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Clasificación de Turnos Pasados</DialogTitle>
                        <DialogDescription className="text-slate-500 pt-1">
                            Estos turnos ya pasaron su fecha pero no han sido marcados como realizados, cancelados ni inasistencias.
                            Clasifícalos con 1 clic para mantener tu contabilidad al día.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 mt-2">
                        {orphans.map(app => {
                            const dateStr = format(new Date(app.start_at), "EEEE d 'de' MMMM", { locale: es });
                            const timeStr = format(new Date(app.start_at), "HH:mm");
                            const isLoading = loadingIds[app.id];

                            return (
                                <div key={app.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between bg-white shadow-sm transition-opacity" style={{ opacity: isLoading ? 0.6 : 1 }}>

                                    {/* Información del Paciente - Toma todo el espacio sobrante */}
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h5 className="font-semibold text-lg text-slate-900 truncate">{app.patient?.name || "Paciente Sin Nombre"}</h5>
                                        <p className="text-sm font-medium text-slate-500 capitalize flex items-center gap-1.5 mt-1">
                                            {dateStr}
                                        </p>
                                        <p className="text-[13px] text-slate-400 mt-0.5">
                                            A las {timeStr}
                                        </p>
                                    </div>

                                    {/* Contenedor de Botones Apilados Verticalmente */}
                                    <div className="flex flex-col gap-2.5 w-full sm:w-[180px] shrink-0 mt-3 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">

                                        <div className="w-full">
                                            <Button
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full justify-start"
                                                disabled={isLoading}
                                                onClick={() => handleAction(app.id, 'Realizada')}
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />}
                                                Realizada
                                            </Button>
                                            <p className="text-[10px] text-slate-500 font-medium mt-1 tracking-tight text-center">Generará deuda al paciente</p>
                                        </div>

                                        <div className="w-full">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-orange-50/50 text-orange-600 border-orange-200 hover:bg-orange-100 w-full justify-start"
                                                disabled={isLoading}
                                                onClick={() => handleAction(app.id, 'No_asistio')}
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-2" /> : <UserX className="w-4 h-4 mr-2 shrink-0" />}
                                                No asistió
                                            </Button>
                                        </div>

                                        <div className="w-full">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
                                                disabled={isLoading}
                                                onClick={() => handleAction(app.id, 'Cancelada')}
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0 mr-2" /> : <XCircle className="w-4 h-4 mr-2 shrink-0" />}
                                                Cancelar
                                            </Button>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
