"use client";

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
    onSubmit?: (data: PatientFormData) => void;
    isPending?: boolean;
}

export default function PatientForm({ open, onOpenChange, initialData, onSubmit, isPending: externalPending }: PatientFormProps) {
    const { user } = useAuth();
    const professionalId = user?.id || null;
    const { mutateAsync: createPatient, isPending: isCreating } = useCreatePatient(professionalId);
    const { mutateAsync: updatePatient, isPending: isUpdating } = useUpdatePatient(professionalId);
    const isPending = externalPending ?? (isCreating || isUpdating);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<PatientFormData>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            name: "",
            alias: "",
            phone: "",
            email: "",
            insurance: "",
            cap: "",
            city: "",
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
                    cap: initialData.cap || "",
                    city: initialData.city || "",
                    notes: initialData.notes || "",
                });
            } else {
                reset({ name: "", alias: "", phone: "", email: "", insurance: "", cap: "", city: "", notes: "" });
            }
        }
    }, [initialData, open, reset]);

    // Simulación de búsqueda automática por Cap (C.P.)
    // Para responder a la duda: Usamos setValue para forzar que el estado de React
    // sobreescriba cualquier cosa que el navegador haya autocompletado.
    const capValue = watch("cap");
    useEffect(() => {
        if (capValue && capValue.length === 4) { // Ejemplo para CP de 4 dígitos (Argentina u otros)
            // Aquí se enviaría la "nueva información" (fetch a una API de códigos postales)
            // Por ahora simulamos una respuesta rápida:
            const simulatedCity = "Buenos Aires";

            // REEMPLAZO FORZADO: setValue asegura que Hook Form tenga el dato real
            // y el input se actualice, ganándole a la sugerencia del navegador.
            setValue("city", simulatedCity, {
                shouldDirty: true,
                shouldValidate: true
            });
        }
    }, [capValue, setValue]);

    const handleFormSubmit = async (data: PatientFormData) => {
        try {
            if (onSubmit) {
                onSubmit(data);
                return;
            }

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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cap">Cap (C.P.)</Label>
                            <Input
                                id="cap"
                                {...register("cap")}
                                placeholder="Ej: 1000"
                                autoComplete="new-password" // Evita que Chrome sugiera datos guardados agresivamente
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="city">Ciudad</Label>
                            <Input
                                id="city"
                                {...register("city")}
                                placeholder="Ej: Buenos Aires"
                                autoComplete="new-password"
                            />
                        </div>
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
