import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patientSchema, PatientFormData, PatientData } from "../types/patient.types";
import { useEffect } from "react";
import { useCreatePatient, useUpdatePatient } from "../hooks/usePatients";
import { useAuth } from "@/features/auth/context/AuthContext";
import { Button } from "@/components/ui/button";

interface PatientFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: PatientData | null;
}

export default function PatientForm({ open, onOpenChange, initialData }: PatientFormProps) {
    const { activeTenantId } = useAuth();
    const { mutateAsync: createPatient, isPending: isCreating } = useCreatePatient(activeTenantId);
    const { mutateAsync: updatePatient, isPending: isUpdating } = useUpdatePatient(activeTenantId);
    const isPending = isCreating || isUpdating;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            name: "",
            alias: "",
            phone: "",
            email: "",
            insurance: "",
            notes: "",
        }
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    alias: initialData.alias || "",
                    phone: initialData.phone || "",
                    email: initialData.email || "",
                    insurance: initialData.insurance || "",
                    notes: initialData.notes || "",
                });
            } else {
                reset({ name: "", alias: "", phone: "", email: "", insurance: "", notes: "" });
            }
        }
    }, [initialData, open, reset]);

    const handleFormSubmit = async (data: PatientFormData) => {
        try {
            if (initialData) {
                await updatePatient({ id: initialData.id, data });
            } else {
                await createPatient(data);
            }
            onOpenChange(false);
            reset();
        } catch (error) {
            // Error handling is managed by hooks (toasts)
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Paciente" : "Añadir Paciente"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Modifica los datos del paciente aquí." : "Ingresa los datos del nuevo paciente aquí."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input id="name" {...register("name")} placeholder="Ej: Juan Pérez" />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="alias">Alias / Apodo</Label>
                            <Input id="alias" {...register("alias")} placeholder="Ej: Juancito" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="insurance">Obra Social / Prepaga</Label>
                            <Input id="insurance" {...register("insurance")} placeholder="Ej: OSDE" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                        <Input id="phone" {...register("phone")} placeholder="+54 9 11 1234-5678" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Correo electrónico</Label>
                        <Input id="email" type="email" {...register("email")} placeholder="juan@ejemplo.com" />
                        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas adicionales</Label>
                        <Input id="notes" {...register("notes")} placeholder="Información relevante..." />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-indigo-600 font-medium hover:bg-indigo-700 w-full"
                        >
                            {isPending ? "Guardando..." : initialData ? "Actualizar Paciente" : "Guardar Paciente"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
