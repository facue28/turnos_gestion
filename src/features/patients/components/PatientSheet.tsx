import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { PatientData } from "../types/patient.types";
import { usePatientAppointments } from "@/features/calendar/hooks/useAppointments";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Phone, Mail, Calendar, CreditCard, ClipboardList, MessageSquare, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getPatientHistory } from "@/app/actions/appointments";
import { getPatientBalance } from "@/app/actions/payments";
import Link from "next/link";

interface PatientSheetProps {
    patient: PatientData | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (patient: PatientData) => void;
}

export default function PatientSheet({ patient, open, onOpenChange, onEdit }: PatientSheetProps) {
    const { data: upcomingAppointments, isLoading: isLoadingApps } = usePatientAppointments(
        patient?.professional_id || null,
        patient?.id,
        { enabled: open }
    );

    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ["patientHistory", patient?.id],
        queryFn: () => getPatientHistory(patient!.id, 4),
        enabled: !!patient?.id && open,
    });

    const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
        queryKey: ["patientBalance", patient?.id],
        queryFn: () => getPatientBalance(patient!.id, true),
        enabled: !!patient?.id && open,
    });

    if (!patient) return null;

    const whatsappUrl = patient.phone
        ? `https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`
        : null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="w-full h-[90vh] md:h-full md:side-right md:max-w-md border-t md:border-l shadow-xl bg-slate-50/50 p-0 flex flex-col"
            >
                <SheetHeader className="bg-white p-4 md:p-6 border-b shrink-0 text-left">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <SheetTitle className="text-xl md:text-2xl font-bold text-slate-900 truncate">
                                        {patient.name}
                                    </SheetTitle>
                                    {patient.is_demo && (
                                        <Badge className="bg-indigo-500 hover:bg-indigo-500 text-[9px] font-black uppercase tracking-widest px-1.5 h-5 shrink-0">Demo</Badge>
                                    )}
                                </div>
                                {patient.alias && (
                                    <p className="text-sm text-slate-500 font-medium truncate">Alias: {patient.alias}</p>
                                )}
                            </div>
                            <Badge variant="outline" className="hidden md:inline-flex bg-indigo-50 text-indigo-700 border-indigo-100 px-2.5 py-0.5 shrink-0">
                                Paciente
                            </Badge>
                        </div>
                        <div className="pt-1">
                            {isLoadingBalance ? (
                                <div className="h-5 w-20 bg-slate-100 animate-pulse rounded"></div>
                            ) : balanceData?.debt && balanceData.debt > 0 ? (
                                <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50">
                                    Adeuda: ${balanceData.debt.toLocaleString("es-AR")}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                                    Al día
                                </Badge>
                            )}
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
                    <div className="p-6 space-y-8">
                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Información de Contacto</h3>
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
                                {patient.phone ? (
                                    <div className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                                <Phone size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-medium tracking-tight">Teléfono</p>
                                                <p className="text-sm font-semibold text-slate-700">{patient.phone}</p>
                                            </div>
                                        </div>
                                        {whatsappUrl && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                asChild
                                            >
                                                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                                    <MessageSquare size={16} />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic pl-11">Sin teléfono registrado</p>
                                )}

                                {patient.email ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Mail size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium tracking-tight">Email</p>
                                            <p className="text-sm font-semibold text-slate-700">{patient.email}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic pl-11">Sin email registrado</p>
                                )}

                                {(patient.cap || patient.city) && (
                                    <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                            <Calendar size={16} className="rotate-90" /> {/* Using something for location */}
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-medium tracking-tight">Ubicación</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {patient.cap && `[${patient.cap}] `}{patient.city || ""}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Professional Info */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Datos Administrativos</h3>
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                        <CreditCard size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium tracking-tight">Obra Social / Prepaga</p>
                                        <p className="text-sm font-semibold text-slate-700">{patient.insurance || "Particular / Sin especificar"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Upcoming / History Box */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Próximos Turnos</h3>
                            {isLoadingApps ? (
                                <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="w-5 h-5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No hay turnos pendientes</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingAppointments.slice(0, 1).map((app) => (
                                        <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex flex-col items-center justify-center text-indigo-600 border border-indigo-100">
                                                    <span className="text-[10px] font-bold leading-none uppercase">{format(parseISO(app.start_at), "MMM", { locale: es })}</span>
                                                    <span className="text-sm font-black leading-none">{format(parseISO(app.start_at), "dd")}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tracking-tight">
                                                        {format(parseISO(app.start_at), "HH:mm")} - {format(parseISO(app.end_at), "HH:mm")}
                                                    </p>
                                                    <p className="text-xs text-slate-500 capitalize">
                                                        {format(parseISO(app.start_at), "EEEE", { locale: es })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-slate-50 border-slate-200 text-slate-500">
                                                {app.modality}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent History Box */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Historial de Turnos</h3>
                            {isLoadingHistory ? (
                                <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="w-5 h-5 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : !historyData || historyData.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <p className="text-sm text-slate-400">Aún no hay turnos registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(historyData.slice(0, 3)).map((app) => (
                                        <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-600 border border-slate-200">
                                                    <span className="text-[10px] font-bold leading-none uppercase">{format(parseISO(app.start_at), "MMM", { locale: es })}</span>
                                                    <span className="text-sm font-black leading-none">{format(parseISO(app.start_at), "dd")}</span>
                                                </div>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-800 tracking-tight">
                                                            {format(parseISO(app.start_at), "HH:mm")}
                                                        </p>
                                                        {app.status === 'Realizada' && <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 border-emerald-200 whitespace-nowrap">Realizada</Badge>}
                                                        {app.status === 'No_asistio' && <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-red-50 text-red-600 border-red-200 whitespace-nowrap">No asistió</Badge>}
                                                        {(app.status === 'Cancelada' || app.status === 'Reprogramada') && <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 border-slate-200 whitespace-nowrap">{app.status}</Badge>}
                                                        {(app.status === 'Nueva' || app.status === 'Confirmada') && <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border-indigo-200 whitespace-nowrap">{app.status}</Badge>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 capitalize flex items-center gap-1 mt-0.5">
                                                        {app.pay_status === 'Cobrado' ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> : <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>}
                                                        {app.pay_status} • ${app.price?.toLocaleString("es-AR") || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {historyData.length > 3 && (
                                        <div className="pt-2">
                                            <Link href={`/pacientes/${patient.id}`} passHref>
                                                <Button variant="outline" className="w-full text-slate-600 bg-white border-slate-200 shadow-sm hover:bg-slate-50">
                                                    Ver historial completo
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-4 pb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Notas Clínicas</h3>
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm min-h-[100px] mb-4">
                                <div className="flex gap-3">
                                    <ClipboardList size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-slate-600 leading-relaxed italic">
                                        {patient.notes || "No hay notas adicionales para este paciente."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t space-y-3 shrink-0">
                    <Button
                        className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2"
                        onClick={() => {
                            if (patient) {
                                onOpenChange(false);
                                onEdit?.(patient);
                            }
                        }}
                    >
                        <Edit size={16} />
                        Editar Información
                    </Button>
                    <Button variant="outline" className="w-full min-h-[44px] text-slate-600 border-slate-200 shadow-sm" onClick={() => onOpenChange(false)}>
                        Cerrar Ficha
                    </Button>
                </div>
            </SheetContent>
        </Sheet >
    );
}
