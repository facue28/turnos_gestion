import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePatients, useDeletePatient } from "../hooks/usePatients";
import { Plus, Search, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PatientForm from "../components/PatientForm";
import { PatientData } from "../types/patient.types";

export default function PatientsPage() {
    const { activeTenantId, isDemoMode } = useAuth();
    const { data: patients, isLoading } = usePatients(activeTenantId);
    const { mutate: deletePatient, isPending: isDeleting } = useDeletePatient(activeTenantId);

    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);

    const filteredPatients = patients?.filter((p) => {
        const term = search.toLowerCase();
        return (
            p.name.toLowerCase().includes(term) ||
            (p.alias && p.alias.toLowerCase().includes(term)) ||
            (p.phone && p.phone.includes(term))
        );
    }) || [];

    if (!activeTenantId) {
        return <div className="p-8 text-center text-slate-500">Seleccionando clínica...</div>;
    }

    const handleEdit = (patient: PatientData) => {
        setSelectedPatient(patient);
        setFormOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${name}?`)) {
            deletePatient(id);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-16">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pacientes</h1>
                    <p className="text-slate-500 mt-1">Gestiona la información de tus pacientes activos.</p>
                </div>
                <Button onClick={() => { setSelectedPatient(null); setFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Paciente
                </Button>
            </div>

            {isDemoMode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm font-medium">
                    Estás en la Clínica Demo. Los datos mostrados aquí son públicos.
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nombre, alias o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white"
                />
            </div>

            {isLoading ? (
                <div className="animate-pulse text-center py-12 text-slate-500">Cargando pacientes...</div>
            ) : filteredPatients.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500 font-medium">No se encontraron pacientes</p>
                    <p className="text-sm text-slate-400 mt-1">
                        {search ? "Intenta con otro término de búsqueda." : "Aún no has registrado ningún paciente."}
                    </p>
                </div>
            ) : (
                <>
                    {/* Vista Mobile (Tarjetas) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredPatients.map(patient => (
                            <div key={patient.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{patient.name}</h3>
                                        {patient.alias && <p className="text-sm text-slate-500">Alias: {patient.alias}</p>}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleEdit(patient)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(patient.id, patient.name)} disabled={isDeleting}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 text-sm text-slate-600">
                                    {patient.phone && (
                                        <a href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-green-600 transition-colors">
                                            <Phone className="h-4 w-4" /> {patient.phone}
                                        </a>
                                    )}
                                    {patient.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" /> {patient.email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vista Desktop (Tabla) */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Nombre / Alias</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Notas</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPatients.map(patient => (
                                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{patient.name}</div>
                                            {patient.alias && <div className="text-slate-500 text-xs mt-0.5">{patient.alias}</div>}
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            {patient.phone && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Phone className="h-3.5 w-3.5" /> {patient.phone}
                                                </div>
                                            )}
                                            {patient.email && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Mail className="h-3.5 w-3.5" /> {patient.email}
                                                </div>
                                            )}
                                            {!patient.phone && !patient.email && <span className="text-slate-400 italic">Sin contacto</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                                            {patient.notes || <span className="text-slate-400 italic">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-indigo-600" onClick={() => handleEdit(patient)}>
                                                    Editar
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(patient.id, patient.name)} disabled={isDeleting}>
                                                    Borrar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Reutilizando form tanto para crear como para editar mediante hook nativo */}
            <PatientForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initialData={selectedPatient}
                isPending={false} // Hack: el hook useUpdatePatient y useCreatePatient deberia manejar este state inline on submit
                onSubmit={() => {
                    // El prop onSubmit en la interface deberia ser ajustado
                    console.warn("Se delega esto en React Hook Form, o pasamos mutation");
                }}
            />
        </div>
    );
}
