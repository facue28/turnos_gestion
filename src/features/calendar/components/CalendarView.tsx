import { useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
import { MoreHorizontal, CheckCircle2, Clock, XCircle, AlertCircle, Lock } from "lucide-react";
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

const CustomEventComponent = ({ event }: { event: CalendarEvent }) => {
    if (event.type === 'block') {
        return (
            <div className="flex items-center justify-center h-full opacity-40" title={event.title}>
                <Lock size={12} className="text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex items-start justify-between h-full overflow-hidden p-1 gap-1 group">
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
                <span className="text-xs font-bold truncate leading-none mb-1">
                    {event.title}
                </span>
                {event.pay_status && (
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded-full bg-white/50 w-fit truncate">
                        {event.pay_status}
                    </span>
                )}
            </div>

            <QuickStatusMenu event={event} />
        </div>
    );
};

const QuickStatusMenu = ({ event }: { event: CalendarEvent }) => {
    const { activeTenantId } = useAuth();
    const { mutate: updateAppointment } = useUpdateAppointment(activeTenantId);

    const handleUpdateStatus = (pay_status: any) => {
        // En un caso real aquí se podría abrir un mini modal para el monto si es Parcial
        // Por ahora simplificamos a los estados directos
        updateAppointment({
            id: event.id,
            data: {
                pay_status,
                // Si es Cobrado, asumimos precio total (esto es una simplificación UX)
                // En el modal completo pueden ajustar el monto exacto
            }
        });
    };

    return (
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
                <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Estado de Pago</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleUpdateStatus('Cobrado')} className="flex gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Marcar como Cobrado</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateStatus('Pendiente')} className="flex gap-2">
                    <Clock size={14} className="text-amber-500" />
                    <span>Dejar Pendiente</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateStatus('Parcial')} className="flex gap-2">
                    <AlertCircle size={14} className="text-blue-500" />
                    <span>Cobro Parcial</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase text-slate-500">Cita</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => updateAppointment({ id: event.id, data: { status: 'Cancelada' } })} className="flex gap-2 text-red-600">
                    <XCircle size={14} />
                    <span>Cancelar Cita</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default function CalendarView() {
    const { activeTenantId, isDemoMode } = useAuth();
    const [view, setView] = useState<any>(Views.WEEK);
    const [date, setDate] = useState(new Date());

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [slotInfo, setSlotInfo] = useState<{ start: Date; end: Date } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null);
    const [showDragConflict, setShowDragConflict] = useState(false);
    const [pendingDragEvent, setPendingDragEvent] = useState<any>(null);

    const { data: appointments } = useAppointments(activeTenantId);
    const { mutate: updateAppointment } = useUpdateAppointment(activeTenantId);
    const { data: availability } = useAvailability(activeTenantId);
    const { data: blocks } = useBlocks(activeTenantId);

    // Transform data to CalendarEvents
    const events = useMemo(() => {
        const calendarEvents: CalendarEvent[] = [];

        // 1. Add Appointments
        if (appointments) {
            appointments.forEach(app => {
                calendarEvents.push({
                    id: app.id,
                    title: `${app.patient?.name} ${app.patient?.last_name}`,
                    start: new Date(app.start_at),
                    end: new Date(app.end_at),
                    type: 'appointment',
                    status: app.status,
                    pay_status: app.pay_status
                });
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

        // 3. Demo Mode Data
        if (isDemoMode && (!appointments || appointments.length === 0)) {
            const today = new Date();
            const demoEvents: CalendarEvent[] = [
                { id: 'd1', title: 'Paciente Demo 1', start: new Date(today.setHours(9, 0)), end: new Date(today.setHours(10, 0)), type: 'appointment', status: 'Nueva', pay_status: 'Cobrado' },
                { id: 'd2', title: 'Paciente Demo 2', start: new Date(today.setHours(11, 30)), end: new Date(today.setHours(12, 30)), type: 'appointment', status: 'Nueva', pay_status: 'Pendiente' },
                // { id: 'd3', title: 'Bloqueo Demo', start: new Date(today.setHours(14, 0)), end: new Date(today.setHours(15, 0)), type: 'block' },
                { id: 'd4', title: 'Paciente Demo 3', start: new Date(addDays(today, 1).setHours(10, 0)), end: new Date(addDays(today, 1).setHours(11, 0)), type: 'appointment', status: 'Nueva', pay_status: 'Cobrado' },
                { id: 'd5', title: 'Paciente Demo 4', start: new Date(addDays(today, 2).setHours(16, 0)), end: new Date(addDays(today, 2).setHours(17, 0)), type: 'appointment', status: 'Nueva', pay_status: 'Pendiente' },
            ];
            calendarEvents.push(...demoEvents);
        }

        return calendarEvents;
    }, [appointments, blocks, isDemoMode]);

    // Calculate dynamic min/max hours based on availability
    const { calendarMin, calendarMax } = useMemo(() => {
        if (!availability || availability.length === 0) {
            return {
                calendarMin: new Date(0, 0, 0, 8, 0, 0),
                calendarMax: new Date(0, 0, 0, 20, 0, 0)
            };
        }

        let minHour = 24;
        let maxHour = 0;

        availability.forEach(a => {
            const startH = parseInt(a.start_time.split(':')[0]);
            const endH = parseInt(a.end_time.split(':')[0]);
            if (startH < minHour) minHour = startH;
            if (endH > maxHour) maxHour = endH;
        });

        // To show until 20:00 inclusive (and see the 20:00 label), 
        // we set max to the start of the next hour.
        return {
            calendarMin: new Date(0, 0, 0, Math.max(0, minHour), 0, 0),
            calendarMax: new Date(0, 0, 0, Math.min(23, maxHour + 1), 0, 0)
        };
    }, [availability]);

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
                color = '#991b1b';
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
        setSlotInfo({ start, end });
        setSelectedAppointment(null);
        setIsDialogOpen(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.type === 'appointment' && appointments) {
            const appointment = appointments.find(a => a.id === event.id);
            if (appointment) {
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
        <div className="h-auto bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <DnDCalendar
                {...{
                    localizer,
                    events,
                    startAccessor: "start",
                    endAccessor: "end",
                    date,
                    onNavigate: setDate,
                    culture: "es",
                    defaultView: Views.WEEK,
                    view,
                    onView: setView,
                    messages: {
                        next: "Sig.",
                        previous: "Ant.",
                        today: "Hoy",
                        month: "Mes",
                        week: "Semana",
                        day: "Día",
                        agenda: "Agenda",
                    },
                    eventPropGetter: eventStyleGetter as any,
                    step: 30,
                    timeslots: 2,
                    selectable: true,
                    onSelectSlot: handleSelectSlot,
                    onSelectEvent: handleSelectEvent as any,
                    onEventDrop: handleEventDrop as any,
                    resizable: true,
                    onEventResize: handleEventDrop as any,
                    min: calendarMin,
                    max: calendarMax,
                    allDaySlot: false,
                    scrollToTime: new Date(),
                    className: "rounded-lg overflow-hidden",
                    dayPropGetter,
                    components: {
                        event: CustomEventComponent as any
                    }
                } as any}
            />

            <AppointmentDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                slotInfo={slotInfo}
                selectedAppointment={selectedAppointment}
                blocks={blocks || []}
                availability={availability || []}
            />

            <AlertDialog open={showDragConflict} onOpenChange={setShowDragConflict}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aviso de Conflicto</AlertDialogTitle>
                        <AlertDialogDescription>
                            Has soltado el turno en un horario con conflictos.
                            ¿Deseas confirmar este cambio de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar movimiento</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => updateAppointment({ id: pendingDragEvent.id, data: pendingDragEvent.payload })}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Confirmar cambio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
