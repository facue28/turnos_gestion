"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, MoreVertical, CreditCard, AlertCircle } from "lucide-react";
import { updateAppointmentStatus, updateAppointmentPaymentStatus } from "@/app/actions/appointments";
import { toast } from "sonner";
import { AppointmentToday } from "@/app/actions/appointments";

interface AppointmentActionsProps {
    appointment: AppointmentToday;
}

export function AppointmentActions({ appointment }: AppointmentActionsProps) {
    const isCompleted = appointment.status === "Realizada";
    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [partialAmount, setPartialAmount] = useState<string>(appointment.paid_amount.toString());
    const [isLoading, setIsLoading] = useState(false);

    const handleStatusChange = async (status: 'Nueva' | 'Realizada') => {
        setIsLoading(true);
        try {
            await updateAppointmentStatus(appointment.id, status);
            toast.success(status === 'Realizada' ? 'Asistencia marcada' : 'Asistencia deshecha');
        } catch (error) {
            toast.error("Error al actualizar el estado");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentChange = async (status: 'Pendiente' | 'Cobrado' | 'Parcial', amount?: number) => {
        setIsLoading(true);
        try {
            await updateAppointmentPaymentStatus(appointment.id, status, amount);
            toast.success('Estado de cobro actualizado');
            setIsPartialModalOpen(false);
        } catch (error) {
            toast.error("Error al actualizar el pago");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePartialSubmit = () => {
        const amount = Number(partialAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Ingresa un monto válido");
            return;
        }
        handlePaymentChange('Parcial', amount);
    };

    return (
        <div className="flex items-center gap-2">
            {!isCompleted ? (
                <Button
                    onClick={() => handleStatusChange('Realizada')}
                    disabled={isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm w-full sm:w-auto"
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar Asistencia
                </Button>
            ) : (
                <Button
                    onClick={() => handleStatusChange('Nueva')}
                    disabled={isLoading}
                    variant="ghost"
                    className="text-slate-400 hover:text-slate-600 w-full sm:w-auto"
                    size="sm"
                >
                    Deshacer asis.
                </Button>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isLoading} className="h-9 w-9 text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => handlePaymentChange('Cobrado', appointment.price)}
                        className="cursor-pointer"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                        <span>Marcar Cobrado</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => setIsPartialModalOpen(true)}
                        className="cursor-pointer"
                    >
                        <CreditCard className="mr-2 h-4 w-4 text-blue-500" />
                        <span>Cobro Parcial</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => handlePaymentChange('Pendiente', 0)}
                        className="cursor-pointer"
                    >
                        <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
                        <span>Marcar Pendiente</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isPartialModalOpen} onOpenChange={setIsPartialModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Registrar Cobro Parcial</DialogTitle>
                        <DialogDescription>
                            El valor total de esta sesión es de <strong>${appointment.price}</strong>.
                            Ingresa el monto que el paciente ha abonado hasta el momento.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto Abonado</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={partialAmount}
                                onChange={(e) => setPartialAmount(e.target.value)}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        {Number(partialAmount) > 0 && appointment.price > 0 && (
                            <div className="bg-slate-50 p-3 rounded-md text-sm border border-slate-200 flex justify-between">
                                <span className="text-slate-500">Saldo pendiente en caja:</span>
                                <span className="font-semibold text-amber-600">
                                    ${Math.max(0, appointment.price - Number(partialAmount))}
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPartialModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handlePartialSubmit} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
                            Guardar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
