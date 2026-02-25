import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patientSchema, PatientFormData, PatientData } from "../types/patient.types";
import { useEffect } from "react";

interface PatientFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: PatientFormData) => void;
    initialData?: PatientData | null;
    isPending: boolean;
}

export default function PatientForm({ open, onOpenChange, onSubmit, initialData, isPending }: PatientFormProps) {
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
                    notes: initialData.notes || "",
                });
            } else {
                reset({ name: "", alias: "", phone: "", email: "", notes: "" });
            }
        }
    }, [initialData, open, reset]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Paciente" : "Añadir Paciente"}</DialogTitle>
                    <DialogDescription>
                        {initialData ? "Modifica los datos del paciente aquí." : "Ingresa los datos del nuevo paciente aquí."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input id="name" {...register("name")} placeholder="Ej: Juan Pérez" />
                        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="alias">Alias / Apodo</Label>
                        <Input id="alias" {...register("alias")} placeholder="Ej: Juancito" />
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
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {isPending ? "Guardando..." : "Guardar Paciente"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
