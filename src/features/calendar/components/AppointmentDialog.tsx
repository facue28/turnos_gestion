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
    const { mutate: createAppointment, isPending: isCreating } = useCreateAppointment(professionalId);
    const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment(professionalId);

    const [patientId, setPatientId] = useState<string>("");
    const [modality, setModality] = useState<AppointmentModality>("presencial");
    const [status, setStatus] = useState<AppointmentStatus>("Nueva");
    const [price, setPrice] = useState<number | string>(0);
    const [duration, setDuration] = useState<number | string>(60);
    const [notes, setNotes] = useState<string>("");
    const [payStatus, setPayStatus] = useState<PaymentStatus>("Pendiente");

    // Controles de fecha y hora nativos
    const [dateStr, setDateStr] = useState<string>("");
    const [timeStr, setTimeStr] = useState<string>("");

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

    const executeSave = (payload: any) => {
        if (mode === 'reprogram' && selectedAppointment) {
            // Generar o arrastrar un link_id para que el historial de reprogramaciones comparta el pago
            const sharedLinkId = selectedAppointment.link_id || crypto.randomUUID();

            // 1. Marca la antigua como 'Reprogramada' y le asignamos el link_id (por si no lo tenía)
            updateAppointment({
                id: selectedAppointment.id,
                data: { status: 'Reprogramada', link_id: sharedLinkId }
            });

            // 2. Crea la nueva agregándole el mismo link_id
            createAppointment({ ...payload, link_id: sharedLinkId }, { onSuccess: onClose });
        } else if (mode === 'edit' && selectedAppointment) {
            updateAppointment(
                { id: selectedAppointment.id, data: payload },
                { onSuccess: onClose }
            );
        } else {
            createAppointment(payload, { onSuccess: onClose });
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

        let finalPaidAmount = 0;
        if (payStatus === 'Cobrado') {
            finalPaidAmount = Number(price);
        } else if (payStatus === 'Parcial' || payStatus === 'OS_pendiente') {
            finalPaidAmount = selectedAppointment?.paid_amount || 0;
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
            setPendingPayload(payload);
            setShowConflictDialog(true);
        } else {
            executeSave(payload);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
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
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hora de Inicio</Label>
                            <Input
                                type="time"
                                value={timeStr}
                                onChange={(e) => setTimeStr(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Modalidad</Label>
                            <Select value={modality} onValueChange={(v: any) => setModality(v)}>
                                <SelectTrigger>
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
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Precio</Label>
                        <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">¿Ya está pagado en su totalidad?</Label>
                            <p className="text-xs text-slate-500">
                                {payStatus === 'Parcial'
                                    ? "Este turno tiene un cobro parcial. Al activarlo pasará a Cobrado total."
                                    : "Activa si el paciente ya abonó el precio completo."}
                            </p>
                        </div>
                        <Switch
                            checked={payStatus === 'Cobrado'}
                            onCheckedChange={(checked) => setPayStatus(checked ? 'Cobrado' : 'Pendiente')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Notas (Opcional)</Label>
                        <Input
                            placeholder="Ej: Trae estudios previos..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
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

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!patientId || isCreating || isUpdating}
                        className="bg-indigo-600 hover:bg-indigo-700"
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
                    <AlertDialogFooter>
                        <AlertDialogCancel>Volver a editar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => executeSave(pendingPayload)}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Agendar de todas formas
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
