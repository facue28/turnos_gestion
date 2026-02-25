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
import { AppointmentData, AppointmentStatus, AppointmentModality } from "../types/calendar.types";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { detectCollision } from "../utils/collisionUtils";
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
}

export default function AppointmentDialog({ isOpen, onClose, slotInfo, selectedAppointment, blocks, availability }: AppointmentDialogProps) {
    const { activeTenantId, user } = useAuth();
    const { mutate: createAppointment, isPending: isCreating } = useCreateAppointment(activeTenantId);
    const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment(activeTenantId);

    const [patientId, setPatientId] = useState<string>("");
    const [modality, setModality] = useState<AppointmentModality>("presencial");
    const [status, setStatus] = useState<AppointmentStatus>("pending");
    const [price, setPrice] = useState<number>(0);
    const [notes, setNotes] = useState<string>("");
    const [isPaid, setIsPaid] = useState(false);
    const [showConflictDialog, setShowConflictDialog] = useState(false);
    const [pendingPayload, setPendingPayload] = useState<any>(null);

    useEffect(() => {
        if (selectedAppointment) {
            setPatientId(selectedAppointment.patient_id);
            setModality(selectedAppointment.modality);
            setStatus(selectedAppointment.status);
            setPrice(selectedAppointment.price);
            setNotes(selectedAppointment.notes || "");
            setIsPaid(selectedAppointment.status === 'paid');
        } else {
            setPatientId("");
            setModality("presencial");
            setStatus("pending");
            setPrice(0);
            setNotes("");
            setIsPaid(false);
        }
    }, [selectedAppointment, isOpen]);

    const executeSave = (payload: any) => {
        if (selectedAppointment) {
            updateAppointment(
                { id: selectedAppointment.id, data: payload },
                { onSuccess: onClose }
            );
        } else {
            createAppointment(payload, { onSuccess: onClose });
        }
    };

    const handleSave = () => {
        if (!patientId || !user?.id) return;

        const start = slotInfo?.start || new Date(selectedAppointment!.start_at);
        const end = slotInfo?.end || new Date(selectedAppointment!.end_at);

        const payload = {
            professional_id: user.id,
            patient_id: patientId,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            duration_min: Math.max(1, differenceInMinutes(end, start)),
            status: isPaid ? 'paid' : status,
            modality,
            price,
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
                        {selectedAppointment ? "Editar Turno" : "Nuevo Turno"}
                    </DialogTitle>
                    {slotInfo && (
                        <p className="text-sm text-slate-500 capitalize">
                            {format(slotInfo.start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
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
                            <Label>Precio</Label>
                            <Input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-semibold">¿Ya está pagado?</Label>
                            <p className="text-xs text-slate-500">Marca si el paciente ya abonó.</p>
                        </div>
                        <Switch
                            checked={isPaid}
                            onCheckedChange={setIsPaid}
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

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        disabled={!patientId || isCreating || isUpdating}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {selectedAppointment ? "Guardar Cambios" : "Confirmar Turno"}
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
