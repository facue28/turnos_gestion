"use client";

import { useState, useMemo, useEffect } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "./calendar-styles.css";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useAppointments, useUpdateAppointment } from "../hooks/useAppointments";
import { useAvailability, useBlocks } from "@/features/settings/hooks/useSettings";
import { CalendarEvent, AppointmentData } from "../types/calendar.types";
import { detectCollision } from "../utils/collisionUtils";
import AppointmentDialog from "./AppointmentDialog";
import { logToTerminal } from "@/app/actions/log";
import { MoreHorizontal, CheckCircle2, Clock, XCircle, AlertCircle, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { createTransaction } from "@/app/actions/payments";

const locales = {
    'es': es,
}

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const DnDCalendar = withDragAndDrop(Calendar as any);

const CustomEventComponent = ({ event, view, onReprogram }: { event: CalendarEvent, view?: string, onReprogram?: (e: CalendarEvent) => void }) => {
    if (event.type === 'block') {
        return (
            <div className="flex items-center justify-center h-full opacity-40" title={event.title}>
                <Lock size={12} className="text-slate-400" />
            </div>
        );
    }

    // Adaptación para la vista de Mes: UI minimalista para encajar en el renglón estrecho de RBC
    if (view === Views.MONTH) {
        return (
            <div className="flex items-center gap-1 px-1 h-full w-full bg-transparent overflow-hidden text-[10px] sm:text-[11px] font-medium truncate">
                {event.pay_status === 'Cobrado' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>}
                {event.pay_status === 'Pendiente' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>}
                {event.pay_status === 'Parcial' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>}
                <span className="truncate flex-1">{event.title}</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-start h-full bg-transparent p-1.5 group relative" style={{ overflow: 'visible' }}>
            {/* Nombre del paciente */}
            <span className="text-[13px] font-bold truncate leading-snug pr-5">
                {event.title}
            </span>

            {/* Badges de estado */}
            <div className="flex flex-wrap gap-1 mt-0.5">
                {event.status && event.status !== 'Nueva' && (
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)] border ${event.status === 'Confirmada' ? 'bg-indigo-100/80 text-indigo-700 border-indigo-200' :
                        event.status === 'Realizada' ? 'bg-indigo-600 text-white border-indigo-700' :
                            event.status === 'No_asistio' ? 'bg-red-600 text-white border-red-700' :
                                'bg-slate-200 text-slate-700 border-slate-300'
                        }`}>
                        {event.status === 'No_asistio' ? 'No asistió' : event.status}
                    </span>
                )}

                {event.pay_status && (
                    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)] border ${event.pay_status === 'Cobrado' ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200' :
                        event.pay_status === 'Pendiente' ? 'bg-amber-100/90 text-amber-700 border-amber-200' :
                            event.pay_status === 'Parcial' ? 'bg-blue-100/90 text-blue-700 border-blue-200' :
                                'bg-white/60 border-white/50'
                        }`}>
                        {event.pay_status}
                    </span>
                )}
            </div>

            {/* Menú de acciones posicionado absolutamente en la esquina superior derecha */}
            <div className="absolute top-1 right-1">
                <QuickStatusMenu event={event} onReprogram={() => onReprogram && onReprogram(event)} />
            </div>
        </div>
    );
};

const QuickStatusMenu = ({ event, onReprogram }: { event: CalendarEvent, onReprogram?: () => void }) => {
    const { user } = useAuth();
    const professionalId = user?.id || null;
    const { mutate: updateAppointment } = useUpdateAppointment(professionalId);

    // Modal state
    const [showCobradoModal, setShowCobradoModal] = useState(false);
    const [showParcialModal, setShowParcialModal] = useState(false);
    const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
    const [partialAmount, setPartialAmount] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdateClinicalStatus = (status: any) => {
        updateAppointment({ id: event.id, data: { status } });
    };

    const handleCancelAppointment = () => {
        updateAppointment({ id: event.id, data: { status: 'Cancelada' } });
    };

    const handleConfirmCobrado = async () => {
        if (!event.patient_id) return;
        setIsSaving(true);
        try {
            const alreadyPaid = event.paid_amount || 0;
            const total = event.price || 0;
            const amountToCharge = Math.max(0, total - alreadyPaid);

            updateAppointment({
                id: event.id,
                data: { pay_status: 'Cobrado', paid_amount: total }
            });

            if (amountToCharge > 0) {
                await createTransaction({
                    patient_id: event.patient_id,
                    amount: amountToCharge,
                    type: 'ingreso',
                    method: payMethod,
                    appointment_id: event.id,
                    description: 'Pago completo de turno'
                }, total);
            }

            toast.success(`Cobrado (${payMethod})`);
            setShowCobradoModal(false);
        } catch (err) {
            toast.error('Error al registrar el cobro');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmParcial = async () => {
        const amount = Number(partialAmount);
        if (!amount || amount <= 0 || !event.patient_id) return;
        setIsSaving(true);
        try {
            const alreadyPaid = event.paid_amount || 0;
            const newTotal = alreadyPaid + amount;
            const price = event.price || 0;
            const newPayStatus = newTotal >= price ? 'Cobrado' : 'Parcial';

            updateAppointment({
                id: event.id,
                data: { pay_status: newPayStatus, paid_amount: newTotal }
            });

            await createTransaction({
                patient_id: event.patient_id,
                amount,
                type: 'ingreso',
                method: payMethod,
                appointment_id: event.id,
                description: 'Pago parcial de turno'
            }, price);

            toast.success(`Cobro parcial registrado ($${amount.toLocaleString('es-AR')})`);
            setShowParcialModal(false);
            setPartialAmount('');
        } catch (err) {
            toast.error('Error al registrar el cobro parcial');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-1 hover:bg-black/5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal size={14} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Estado Clínico</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleUpdateClinicalStatus('Confirmada')} className="flex gap-2">
                        <CheckCircle2 size={14} className="text-indigo-500" />
                        <span>Marcar Confirmada</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateClinicalStatus('Realizada')} className="flex gap-2">
                        <CheckCircle2 size={14} className="text-indigo-700" />
                        <span>Marcar Realizada</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Estado de Pago</DropdownMenuLabel>
                    <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setPayMethod('efectivo'); setShowCobradoModal(true); }}
                        className="flex gap-2"
                        disabled={event.pay_status === 'Cobrado'}
                    >
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>Marcar como Cobrado</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateAppointment({ id: event.id, data: { pay_status: 'Pendiente' } })} className="flex gap-2">
                        <Clock size={14} className="text-amber-500" />
                        <span>Dejar Pendiente</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setPayMethod('efectivo'); setPartialAmount(''); setShowParcialModal(true); }}
                        className="flex gap-2"
                    >
                        <AlertCircle size={14} className="text-blue-500" />
                        <span>Cobro Parcial</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Acciones de Cita</DropdownMenuLabel>
                    {onReprogram && (
                        <DropdownMenuItem onClick={onReprogram} className="flex gap-2 text-slate-600">
                            <RefreshCw size={14} />
                            <span>Reprogramar Cita</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleCancelAppointment} className="flex gap-2 text-red-600">
                        <XCircle size={14} />
                        <span>Cancelar Cita</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal: Cobro Completo */}
            <AlertDialog open={showCobradoModal} onOpenChange={setShowCobradoModal}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Registrar Cobro Completo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se registrará un pago de <strong>${((event.price || 0) - (event.paid_amount || 0)).toLocaleString('es-AR')}</strong> en Caja.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex gap-2 py-2">
                        <button
                            type="button"
                            onClick={() => setPayMethod('efectivo')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${payMethod === 'efectivo'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                                }`}
                        >
                            💵 Efectivo
                        </button>
                        <button
                            type="button"
                            onClick={() => setPayMethod('transferencia')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${payMethod === 'transferencia'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                                }`}
                        >
                            🏦 Transferencia
                        </button>
                    </div>
                    <AlertDialogFooter className="gap-3 sm:gap-2">
                        <AlertDialogCancel disabled={isSaving} className="min-h-[44px] sm:min-h-0">Cancelar</AlertDialogCancel>
                        <button
                            onClick={handleConfirmCobrado}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded-md text-sm font-semibold min-h-[44px] sm:h-10 px-5 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 active:bg-emerald-800 transition-all duration-100 disabled:opacity-50 shadow-sm"
                        >
                            {isSaving ? 'Guardando...' : 'Confirmar Cobro'}
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal: Cobro Parcial */}
            <AlertDialog open={showParcialModal} onOpenChange={setShowParcialModal}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Registrar Cobro Parcial</AlertDialogTitle>
                        <AlertDialogDescription>
                            Precio total del turno: <strong>${(event.price || 0).toLocaleString('es-AR')}</strong>. Ya cobrado: <strong>${(event.paid_amount || 0).toLocaleString('es-AR')}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Monto cobrado hoy</label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-medium">$</span>
                                <Input
                                    type="number"
                                    placeholder="Ej: 5000"
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(e.target.value)}
                                    className="h-10"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Método de pago</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('efectivo')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${payMethod === 'efectivo'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                                        }`}
                                >
                                    💵 Efectivo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('transferencia')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all ${payMethod === 'transferencia'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                                        }`}
                                >
                                    🏦 Transferencia
                                </button>
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter className="gap-3 sm:gap-2">
                        <AlertDialogCancel disabled={isSaving} className="min-h-[44px] sm:min-h-0">Cancelar</AlertDialogCancel>
                        <button
                            onClick={handleConfirmParcial}
                            disabled={isSaving || !partialAmount || Number(partialAmount) <= 0}
                            className="inline-flex items-center justify-center rounded-md text-sm font-semibold min-h-[44px] sm:h-10 px-5 bg-blue-600 text-white hover:bg-blue-700 active:scale-95 active:bg-blue-800 transition-all duration-100 disabled:opacity-50 shadow-sm"
                        >
                            {isSaving ? 'Guardando...' : 'Confirmar Pago Parcial'}
                        </button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default function CalendarView() {
    const { isDemoMode, user } = useAuth();
    const professionalId = user?.id || null;
    const [view, setView] = useState<any>(Views.WEEK);
    const [date, setDate] = useState(new Date());

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [slotInfo, setSlotInfo] = useState<{ start: Date; end: Date } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
    const [showDragConflict, setShowDragConflict] = useState(false);
    const [pendingDragEvent, setPendingDragEvent] = useState<any>(null);
    const [showClickConflict, setShowClickConflict] = useState(false);
    const [pendingClickSlot, setPendingClickSlot] = useState<{ start: Date; end: Date } | null>(null);

    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'reprogram'>('create');

    useEffect(() => {
        logToTerminal(`Cambio de fecha o vista. Modo actual: ${view}, Fecha focal: ${date.toISOString()}`);
    }, [view, date]);

    const handleReprogramMenuClick = (event: CalendarEvent) => {
        const appointment = appointments?.find(a => a.id === event.id);
        if (appointment) {
            setDialogMode('reprogram');
            setSelectedAppointment(appointment);
            setSlotInfo(null);
            setIsDialogOpen(true);
        }
    };

    const { data: appointments } = useAppointments(professionalId);
    const { mutate: updateAppointment } = useUpdateAppointment(professionalId);
    const { data: availability } = useAvailability(professionalId);
    const { data: blocks } = useBlocks(professionalId);

    useEffect(() => {
        if (!appointments || typeof window === 'undefined') return;
        const febEvents = appointments.filter(e => {
            const d = new Date(e.start_at);
            return d.getMonth() === 1 && d.getFullYear() === 2026;
        });
        logToTerminal("==== AUDITORIA CALENDARIO FETCHING ====", {
            totalAppointments: appointments.length,
            februaryAppointments: febEvents.length,
            sample: febEvents.slice(0, 3)
        });
    }, [appointments]);

    // Transform data to CalendarEvents
    const events = useMemo(() => {
        const calendarEvents: CalendarEvent[] = [];

        // 1. Add Appointments
        if (appointments) {
            appointments.forEach(app => {
                if (app.status !== 'Cancelada') {
                    calendarEvents.push({
                        id: app.id,
                        title: `${app.patient?.name || 'Paciente Sin Nombre'}`,
                        patientId: app.patient_id,
                        patient_id: app.patient_id,
                        start: new Date(app.start_at),
                        end: new Date(app.end_at),
                        type: 'appointment',
                        status: app.status || 'Nueva',
                        pay_status: app.pay_status || 'Pendiente',
                        price: app.price || 0,
                        paid_amount: app.paid_amount || 0
                    });
                }
            });
        }

        // 2. Add Blocks - WE NO LONGER ADD BLOCKS TO THE EVENTS ARRAY
        // They are handled by dayPropGetter for the background tinting effect.
        // This removes the "top bar" the user wants gone.
        /*
        if (blocks) {
            blocks.forEach(block => {
                calendarEvents.push({
                    id: block.id,
                    title: block.reason || "Bloqueo",
                    start: new Date(block.start_at),
                    end: new Date(block.end_at),
                    type: 'block'
                });
            });
        }
        */

        // 3. Demo Mode Data - REMOVED: Now using persistent DB patients

        return calendarEvents;
    }, [appointments, blocks, isDemoMode, view, date]);

    // Calculate dynamic min/max hours based on availability AND events
    const { calendarMin, calendarMax } = useMemo(() => {
        let minHour = 24;
        let maxHour = 0;

        if (availability && availability.length > 0) {
            availability.forEach(a => {
                const startH = parseInt(a.start_time.split(':')[0]);
                const endH = parseInt(a.end_time.split(':')[0]);
                if (startH < minHour) minHour = startH;
                if (endH > maxHour) maxHour = endH;
            });
        } else {
            minHour = 8;
            maxHour = 20;
        }

        // Expand bounds if there are events outside the availability
        events.forEach(e => {
            const startH = e.start.getHours();
            const endH = e.end.getHours();
            if (startH < minHour) minHour = startH;
            if (endH > maxHour) maxHour = endH;
        });

        // Add 1 hour padding at the bottom for visibility
        return {
            calendarMin: new Date(0, 0, 0, Math.max(0, minHour), 0, 0),
            calendarMax: new Date(0, 0, 0, Math.min(24, maxHour + 1), 0, 0)
        };
    }, [availability, events]);

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#f1f5f9'; // slate-100 default
        let borderLeftColor = '#94a3b8'; // slate-400
        let color = '#334155'; // slate-700

        if (event.type === 'appointment') {
            if (event.pay_status === 'Cobrado') {
                backgroundColor = '#f0fdf4'; // emerald-50
                borderLeftColor = '#10b981'; // emerald-500
                color = '#065f46'; // emerald-800
            } else if (event.pay_status === 'Pendiente') {
                backgroundColor = '#fffbeb'; // amber-50
                borderLeftColor = '#f59e0b'; // amber-500
                color = '#92400e'; // amber-800
            } else if (event.pay_status === 'Parcial') {
                backgroundColor = '#eff6ff'; // blue-50
                borderLeftColor = '#3b82f6'; // blue-500
                color = '#1e40af'; // blue-800
            } else {
                backgroundColor = '#f8fafc'; // slate-50
                borderLeftColor = '#94a3b8'; // slate-400
                color = '#475569'; // slate-600
            }

            if (event.status === 'Cancelada') {
                backgroundColor = '#fef2f2'; // red-50
                borderLeftColor = '#ef4444'; // red-500
                color = '#991b1b'; // red-800
            } else if (event.status === 'Confirmada') {
                // Si está confirmada pero NO está cobrada parcialmente ni total, advertencia en ámbar
                if (event.pay_status === 'Pendiente') {
                    backgroundColor = '#fef3c7'; // amber-100
                    borderLeftColor = '#d97706'; // amber-600
                    color = '#92400e'; // amber-900
                } else {
                    backgroundColor = '#f0fdf4'; // emerald-50 
                    borderLeftColor = '#059669'; // emerald-600
                    color = '#065f46'; // emerald-800
                }
            } else if (event.status === 'Reprogramada') {
                backgroundColor = '#f3f4f6'; // gray-100
                borderLeftColor = '#9ca3af'; // gray-400
                color = '#4b5563'; // gray-600
                // Opacidad extra para denotar estado archivado/reprogramado
                backgroundColor = 'rgba(243, 244, 246, 0.7)';
            }
        } else if (event.type === 'block') {
            return {
                style: {
                    backgroundColor: 'transparent',
                    backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '12px',
                    opacity: 0.5
                }
            };

        }

        return {
            style: {
                backgroundColor,
                color,
                borderLeft: `5px solid ${borderLeftColor}`,
                borderRadius: '12px', // rounded-xl feel
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                padding: '0px' // Custom component handles padding
            }
        };
    };

    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        const hasCollision = detectCollision(start, end, blocks || [], availability || []);
        if (hasCollision) {
            setPendingClickSlot({ start, end });
            setShowClickConflict(true);
        } else {
            proceedWithSlotSelection(start, end);
        }
    };

    const proceedWithSlotSelection = (start: Date, end: Date) => {
        setDialogMode('create');
        setSlotInfo({ start, end });
        setSelectedAppointment(null);
        setIsDialogOpen(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.type === 'appointment' && appointments) {
            const appointment = appointments.find(a => a.id === event.id);
            if (appointment) {
                setDialogMode('edit');
                setSelectedAppointment(appointment);
                setSlotInfo({ start: new Date(appointment.start_at), end: new Date(appointment.end_at) });
                setIsDialogOpen(true);
            }
        }
    };

    const handleEventDrop = ({ event, start, end }: any) => {
        if (event.type !== 'appointment') return;

        const payload = {
            start_at: start.toISOString(),
            end_at: end.toISOString()
        };

        const hasCollision = detectCollision(start, end, blocks || [], availability || []);

        if (hasCollision) {
            setPendingDragEvent({ id: event.id, payload });
            setShowDragConflict(true);
        } else {
            updateAppointment({ id: event.id, data: payload });
        }
    };

    const dayPropGetter = (date: Date) => {
        const dow = getDay(date);
        const dayAvailability = availability?.filter(a => a.weekday === dow);

        // Date range for the specific day to check against blocks
        const dayStart = startOfDay(date);

        // Tint all-day / multi-day blocks
        const hasFullDayBlock = blocks?.some(b => {
            const bStart = new Date(b.start_at);
            const bEnd = new Date(b.end_at);

            // Check if this day overlaps with the block period
            // We use a generous overlap check for "clausurado" effect
            const blockStartAtDayStart = startOfDay(bStart);
            const blockEndAtDayEnd = endOfDay(bEnd);

            return isWithinInterval(dayStart, { start: blockStartAtDayStart, end: blockEndAtDayEnd });
        });

        if (hasFullDayBlock) {
            return {
                className: "bg-blocked-column",
                style: {
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(241, 245, 249, 0.5), rgba(241, 245, 249, 0.5) 10px, rgba(255, 255, 255, 0.5) 10px, rgba(255, 255, 255, 0.5) 20px)',
                    backgroundColor: '#f8fafc'
                }
            };
        }

        // Tint weekends or non-available days (only if not already blocked)
        if (!dayAvailability || dayAvailability.length === 0) {
            return {
                className: "bg-non-working-day",
                style: { backgroundColor: '#f8fafc' }
            };
        }
        return {};
    };

    return (
        <div className={`w-full bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col ${view === Views.MONTH ? 'h-[850px]' : 'h-auto'}`}>


            <div className="flex-1 min-h-0 w-full overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[800px] h-full md:min-w-0">
                    <DnDCalendar
                        style={{ height: '100%', width: '100%' }}
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        date={date}
                        onNavigate={setDate}
                        culture="es"
                        defaultView={Views.WEEK}
                        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                        view={view}
                        onView={setView}
                        messages={{
                            next: "Sig.",
                            previous: "Ant.",
                            today: "Hoy",
                            month: "Mes",
                            week: "Semana",
                            day: "Día",
                            agenda: "Agenda",
                        }}
                        eventPropGetter={eventStyleGetter as any}
                        step={30}
                        timeslots={2}
                        selectable={true}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent as any}
                        onEventDrop={handleEventDrop as any}
                        resizable={true}
                        onEventResize={handleEventDrop as any}
                        min={calendarMin}
                        max={calendarMax}
                        scrollToTime={new Date()}
                        className="rounded-lg overflow-hidden"
                        dayPropGetter={dayPropGetter}
                        components={{
                            event: ((props: any) => <CustomEventComponent {...props} view={view} onReprogram={handleReprogramMenuClick} />) as any
                        }}
                    />
                </div>
            </div>

            <AppointmentDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                slotInfo={slotInfo}
                selectedAppointment={selectedAppointment}
                blocks={blocks || []}
                availability={availability || []}
                mode={dialogMode}
            />

            <AlertDialog open={showDragConflict} onOpenChange={setShowDragConflict}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aviso de Conflicto</AlertDialogTitle>
                        <AlertDialogDescription>
                            Has soltado el turno en un horario con conflictos o fuera de tu horario de atención.
                            ¿Deseas confirmar este cambio de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-2">
                        <AlertDialogCancel className="min-h-[44px] sm:min-h-0">Cancelar movimiento</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => updateAppointment({ id: pendingDragEvent.id, data: pendingDragEvent.payload })}
                            className="bg-indigo-600 hover:bg-indigo-700 min-h-[44px] sm:min-h-0"
                        >
                            Confirmar cambio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showClickConflict} onOpenChange={setShowClickConflict}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aviso de Conflicto</AlertDialogTitle>
                        <AlertDialogDescription>
                            Has seleccionado un horario que se encuentra bloqueado o fuera de tus días y horas de atención declarados.
                            ¿Deseas continuar y agendar un turno aquí de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-2">
                        <AlertDialogCancel onClick={() => setPendingClickSlot(null)} className="min-h-[44px] sm:min-h-0">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowClickConflict(false);
                                if (pendingClickSlot) {
                                    proceedWithSlotSelection(pendingClickSlot.start, pendingClickSlot.end);
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 min-h-[44px] sm:min-h-0"
                        >
                            Sí, proceder a agendar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
