"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PatientSelect } from "@/features/patients/components/PatientSelect";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCreateAppointment, useUpdateAppointment } from "../hooks/useAppointments";
import { AppointmentData, AppointmentStatus, AppointmentModality, PaymentStatus } from "../types/calendar.types";
import { format, differenceInMinutes, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { detectCollision } from "../utils/collisionUtils";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { BlockData, AvailabilityData } from "../../settings/types/settings.types";
import { createTransaction } from "@/app/actions/payments";
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

interface AppointmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    slotInfo: { start: Date; end: Date } | null;
    selectedAppointment?: AppointmentData | null;
    blocks: BlockData[];
    availability: AvailabilityData[];
    preselectedPatientId?: string | null;
    mode?: 'create' | 'edit' | 'reprogram';
}

export default function AppointmentDialog({ isOpen, onClose, slotInfo, selectedAppointment, blocks, availability, preselectedPatientId, mode = 'create' }: AppointmentDialogProps) {
    const { user } = useAuth();
    const professionalId = user?.id || null;
    const { data: settings } = useSettings(professionalId);
    const { mutateAsync: createAppointmentAsync, isPending: isCreating } = useCreateAppointment(professionalId);
    const { mutateAsync: updateAppointmentAsync, isPending: isUpdating } = useUpdateAppointment(professionalId);

    const [patientId, setPatientId] = useState<string>("");
    const [modality, setModality] = useState<AppointmentModality>("presencial");
    const [status, setStatus] = useState<AppointmentStatus>("Nueva");
    const [price, setPrice] = useState<number | string>(0);
    const [duration, setDuration] = useState<number | string>(60);
    const [notes, setNotes] = useState<string>("");
    const [payStatus, setPayStatus] = useState<PaymentStatus>("Pendiente");
    const [payMethod, setPayMethod] = useState<'efectivo' | 'transferencia'>('efectivo');

    // Controles de fecha y hora nativos
    const [dateStr, setDateStr] = useState<string>("");
    const [timeStr, setTimeStr] = useState<string>("");
    const [partialAmount, setPartialAmount] = useState<number | string>("");

    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<any>(null);

    useEffect(() => {
        if (selectedAppointment && mode !== 'create') {
            setPatientId(selectedAppointment.patient_id);
            setModality(selectedAppointment.modality);

            // Si es reprogramar, ponemos el status a "Nueva" para el nuevo turno
            setStatus(mode === 'reprogram' ? 'Nueva' : selectedAppointment.status);

            setPrice(selectedAppointment.price);
            setDuration(selectedAppointment.duration_min);
            setNotes(selectedAppointment.notes || "");

            // Conservar el estado de pago de la cita al reprogramar igual que al editar
            setPayStatus(selectedAppointment.pay_status);
            if (selectedAppointment.pay_status === 'Parcial') {
                setPartialAmount(""); // Start empty so they only type the *new* payment if they want
            }

            // Autocompletar fecha y hora
            const startD = new Date(selectedAppointment.start_at);
            setDateStr(format(startD, 'yyyy-MM-dd'));
            setTimeStr(format(startD, 'HH:mm'));

        } else {
            setPatientId(preselectedPatientId || "");
            setModality("presencial");
            setStatus("Nueva");
            setPrice(settings?.default_price || 0);

            // Prioridad: slotInfo > settings > default 60
            const initialDuration = slotInfo
                ? differenceInMinutes(slotInfo.end, slotInfo.start)
                : (settings?.default_duration || 60);

            setDuration(initialDuration);
            setNotes("");
            setPayStatus("Pendiente");

            if (slotInfo) {
                setDateStr(format(slotInfo.start, 'yyyy-MM-dd'));
                setTimeStr(format(slotInfo.start, 'HH:mm'));
            } else {
                const now = new Date();
                setDateStr(format(now, 'yyyy-MM-dd'));
                setTimeStr(format(now, 'HH:mm'));
            }
        }
    }, [selectedAppointment, isOpen, settings, slotInfo, preselectedPatientId, mode]);

    const executeSave = async (payload: any, amountToCharge: number) => {
        try {
            const processTransaction = async (appointmentId: string) => {
                if (amountToCharge > 0 && patientId) {
                    await createTransaction({
                        patient_id: patientId,
                        amount: amountToCharge,
                        type: 'ingreso',
                        method: payMethod,
                        appointment_id: appointmentId,
                        description: payStatus === 'Cobrado' ? 'Pago completo de turno' : 'Pago parcial de turno'
                    }, Number(price) || 0); // Pass expected total
                }
            };

            if (mode === 'reprogram' && selectedAppointment) {
                const sharedLinkId = selectedAppointment.link_id || crypto.randomUUID();

                await updateAppointmentAsync({
                    id: selectedAppointment.id,
                    data: { status: 'Reprogramada', link_id: sharedLinkId }
                });

                const newApp = await createAppointmentAsync({ ...payload, link_id: sharedLinkId });
                if (newApp && newApp.id) await processTransaction(newApp.id);
                onClose();

            } else if (mode === 'edit' && selectedAppointment) {
                await updateAppointmentAsync({ id: selectedAppointment.id, data: payload });
                await processTransaction(selectedAppointment.id);
                onClose();

            } else {
                const newApp = await createAppointmentAsync(payload);
                if (newApp && newApp.id) await processTransaction(newApp.id);
                onClose();
            }
        } catch (error) {
            console.error("Error al guardar el turno o registrar el pago", error);
        }
    };

    const handleSave = () => {
        if (!patientId || !user?.id || !dateStr || !timeStr) return;

        // Validar y construir fecha desde los inputs
        const start = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(start.getTime())) {
            return; // Fecha no válida
        }

        // Calculamos el end dinámicamente basado en la duración elegida (con fallback seguro)
        const finalDuration = Math.max(1, Number(duration) || settings?.default_duration || 60);
        const end = addMinutes(start, finalDuration);

        let amountToCharge = 0;
        let finalPaidAmount = selectedAppointment?.paid_amount || 0;

        if (payStatus === 'Cobrado' && selectedAppointment?.pay_status !== 'Cobrado') {
            amountToCharge = Number(price) - finalPaidAmount;
        } else if (payStatus === 'Parcial' && Number(partialAmount) > 0) {
            amountToCharge = Number(partialAmount);
        }

        if (amountToCharge > 0) {
            finalPaidAmount += amountToCharge;
        }

        const payload = {
            professional_id: user.id,
            patient_id: patientId,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            duration_min: finalDuration,
            status: status, // Defaults to 'Nueva'
            pay_status: payStatus,
            paid_amount: finalPaidAmount,
            modality,
            price: Number(price) || 0,
            notes: notes.trim() || undefined,
        };

        const hasCollision = detectCollision(start, end, blocks, availability);

        if (hasCollision) {
            // Guardamos el amountToCharge también en un ref o state si el usuario presiona "Agendar de todas formas"
            setPendingPayload({ payload, amountToCharge });
            setShowConflictDialog(true);
        } else {
            executeSave(payload, amountToCharge);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 md:p-6 overflow-y-auto max-h-[95vh] rounded-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {mode === 'reprogram' ? "Reprogramar Turno" : (mode === 'edit' ? "Editar Turno" : "Nuevo Turno")}
                    </DialogTitle>
                    {mode === 'reprogram' && (
                        <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200 mt-2">
                            Se creará un nuevo turno y el actual quedará archivado como "Reprogramada".
                        </p>
                    )}
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Paciente</Label>
                        <PatientSelect
                            value={patientId}
                            onChange={setPatientId}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                                className="min-h-[44px] md:min-h-0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora de Inicio</Label>
                            <Input
                                type="time"
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                                className="min-h-[44px] md:min-h-0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Modalidad</Label>
                            <Select value={modality} onValueChange={(v: any) => setModality(v)}>
                                <SelectTrigger className="min-h-[44px] md:min-h-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="presencial">Presencial</SelectItem>
                                    <SelectItem value="virtual">Virtual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Duración (min)</Label>
                            <Input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                min={1}
                                className="min-h-[44px] md:min-h-0"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Precio</Label>
                        <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="min-h-[44px] md:min-h-0"
                        />
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200 shadow-sm">
                        <Label className="text-sm font-semibold text-slate-800">Estado de Cobro</Label>
                        <Select value={payStatus} onValueChange={(v: any) => setPayStatus(v)}>
                            <SelectTrigger className="bg-white min-h-[44px] md:min-h-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Pendiente">Pendiente (No pagó)</SelectItem>
                                <SelectItem value="Parcial">Cobro Parcial (Seña / Entrega)</SelectItem>
                                <SelectItem value="Cobrado">Pagado ({Number(price) ? `Total de $${price}` : 'Total'})</SelectItem>
                            </SelectContent>
                        </Select>

                        {payStatus === 'Parcial' && (
                            <div className="mt-3 bg-white p-3 rounded-md border shadow-sm space-y-3 animate-in fade-in duration-300">
                                <div>
                                    <Label className="text-xs font-semibold text-blue-700 block mb-1.5">Monto ingresado hoy</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">$</span>
                                        <Input
                                            type="number"
                                            placeholder="Ej: 5000"
                                            value={partialAmount}
                                            onChange={(e) => setPartialAmount(e.target.value)}
                                            className="h-11 md:h-9"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1.5">Método de pago</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPayMethod('efectivo')}
                                            className={`flex-1 py-1.5 px-3 min-h-[44px] md:min-h-0 rounded-md text-xs font-semibold border transition-all ${payMethod === 'efectivo'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                                                }`}
                                        >
                                            💵 Efectivo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPayMethod('transferencia')}
                                            className={`flex-1 py-1.5 px-3 min-h-[44px] md:min-h-0 rounded-md text-xs font-semibold border transition-all ${payMethod === 'transferencia'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                                                }`}
                                        >
                                            🏦 Transferencia
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">Se registrará un movimiento de caja con el método seleccionado.</p>
                            </div>
                        )}
                        {payStatus === 'Cobrado' && selectedAppointment?.pay_status !== 'Cobrado' && (
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg space-y-2 animate-in fade-in duration-300">
                                <p className="text-xs text-emerald-700 font-medium">
                                    Se registrará un ingreso en caja cancelando la deuda del turno.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPayMethod('efectivo')}
                                        className={`flex-1 min-h-[44px] md:min-h-0 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${payMethod === 'efectivo'
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                                            }`}
                                    >
                                        💵 Efectivo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPayMethod('transferencia')}
                                        className={`flex-1 min-h-[44px] md:min-h-0 py-1.5 px-3 rounded-md text-xs font-semibold border transition-all ${payMethod === 'transferencia'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'
                                            }`}
                                    >
                                        🏦 Transferencia
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Notas (Opcional)</Label>
                        <Input
                            placeholder="Ej: Trae estudios previos..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[44px] md:min-h-0"
                        />
                    </div>
                </div>

                {mode !== 'create' && mode !== 'reprogram' && (
                    <div className="grid gap-4 px-4 pb-4">
                        <div className="space-y-2">
                            <Label>Estado del Turno</Label>
                            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Nueva">Nueva</SelectItem>
                                    <SelectItem value="Confirmada">Confirmada</SelectItem>
                                    <SelectItem value="Realizada">Realizada</SelectItem>
                                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                                    <SelectItem value="No_asistio">No asistió</SelectItem>
                                    <SelectItem value="Reprogramada">Reprogramada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" onClick={onClose} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!patientId || isCreating || isUpdating}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 min-h-[44px] sm:min-h-0"
                    >
                        {mode === 'reprogram' ? "Confirmar Reprogramación" : (mode === 'edit' ? "Guardar Cambios" : "Confirmar Turno")}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Aviso de Conflicto</AlertDialogTitle>
                        <AlertDialogDescription>
                            Este horario coincide con un bloqueo o está fuera de tu jornada laboral.
                            ¿Deseas agendarlo de todas formas?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-3">
                        <AlertDialogCancel className="w-full sm:w-auto min-h-[44px] sm:min-h-0">Volver a editar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => executeSave(pendingPayload.payload, pendingPayload.amountToCharge)}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 min-h-[44px] sm:min-h-0"
                        >
                            Agendar de todas formas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
