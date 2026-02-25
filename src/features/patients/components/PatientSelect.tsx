import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { usePatients, useCreatePatient } from "../hooks/usePatients";
import { useAuth } from "@/features/auth/context/AuthContext";
import PatientForm from "./PatientForm";

interface PatientSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function PatientSelect({ value, onChange }: PatientSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);

    const { activeTenantId } = useAuth();
    const { data: patients, isLoading } = usePatients(activeTenantId);
    const { mutate: createPatient, isPending } = useCreatePatient(activeTenantId);

    const selectedPatient = patients?.find((p) => p.id === value);

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                        disabled={isLoading}
                    >
                        {selectedPatient
                            ? selectedPatient.name
                            : isLoading ? "Cargando..." : "Seleccionar paciente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                    <Command filter={(value, search) => {
                        if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                        return 0;
                    }}>
                        <CommandInput placeholder="Buscar por nombre, alias o teléfono..." />
                        <CommandList>
                            <CommandEmpty className="py-6 text-center text-sm">
                                <p className="text-slate-500 mb-4">No se encontró ningún paciente.</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                        setOpen(false);
                                        setIsFormOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Crear paciente
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {patients?.map((patient) => (
                                    <CommandItem
                                        key={patient.id}
                                        value={`${patient.name} ${patient.alias || ''} ${patient.phone || ''}`}
                                        onSelect={() => {
                                            onChange(patient.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === patient.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{patient.name} {patient.alias && <span className="text-slate-400">({patient.alias})</span>}</span>
                                            {patient.phone && <span className="text-xs text-slate-500">{patient.phone}</span>}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                        <div className="p-2 border-t">
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-start text-indigo-600 gap-2 font-normal"
                                onClick={() => {
                                    setOpen(false);
                                    setIsFormOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4" />
                                Añadir nuevo paciente
                            </Button>
                        </div>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Dialog for Quick Create */}
            <PatientForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                isPending={isPending}
                onSubmit={(data) => {
                    createPatient(data, {
                        onSuccess: (newPatient) => {
                            setIsFormOpen(false);
                            onChange(newPatient.id); // Auto-select the newly created patient
                        }
                    });
                }}
            />
        </>
    );
}
