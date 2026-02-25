import { useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePatients, useDeletePatient } from "../hooks/usePatients";
import { Plus, Search, Phone, Mail, Edit, Trash2, ExternalLink, MessageSquare, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PatientForm from "../components/PatientForm";
import PatientSheet from "../components/PatientSheet";
import { PatientData } from "../types/patient.types";
import { Badge } from "@/components/ui/badge";

export default function PatientsPage() {
    const { activeTenantId, isDemoMode } = useAuth();
    const { data: patients, isLoading } = usePatients(activeTenantId, isDemoMode);
    const { mutate: deletePatient } = useDeletePatient(activeTenantId);

    const [search, setSearch] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
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

    const handleEdit = (patient: PatientData, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPatient(patient);
        setFormOpen(true);
    };

    const handleOpenSheet = (patient: PatientData) => {
        setSelectedPatient(patient);
        setSheetOpen(true);
    };

    const handleDelete = (patient: PatientData, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${patient.name}?`)) {
            deletePatient(patient.id);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-24">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pacientes</h1>
                    <p className="text-slate-500 mt-1">Base de datos centralizada de tus pacientes.</p>
                </div>
                <Button onClick={() => { setSelectedPatient(null); setFormOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Paciente
                </Button>
            </div>

            {isDemoMode && (
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Modo Demo Activo: Se han inyectado pacientes de prueba realistas para visualización.
                </div>
            )}

            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                    placeholder="Buscar por nombre, alias o teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-12 h-12 bg-white border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all text-base"
                />
            </div>

            {isLoading ? (
                <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Cargando base de pacientes...</p>
                </div>
            ) : filteredPatients.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <p className="text-slate-500 font-medium text-lg">No se encontraron pacientes</p>
                    <p className="text-sm text-slate-400 mt-2">
                        {search ? "Intenta con otro término de búsqueda." : "Aún no tienes pacientes registrados para esta clínica."}
                    </p>
                </div>
            ) : (
                <>
                    {/* Vista Mobile (Tarjetas) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredPatients.map(patient => (
                            <div
                                key={patient.id}
                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 active:scale-[0.98] transition-all"
                                onClick={() => handleOpenSheet(patient)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{patient.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-1.5 uppercase">
                                                {patient.insurance || "Público / Sin Obra"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-lg"
                                            onClick={(e) => handleEdit(patient, e)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    {patient.phone && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 bg-green-50/50 text-green-700 border-green-100 hover:bg-green-100 rounded-xl h-10 gap-2"
                                            asChild
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <a href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                                                <MessageSquare size={16} /> WhatsApp
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 rounded-xl h-10 gap-2"
                                    >
                                        <ExternalLink size={16} /> Ficha
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vista Desktop (Tabla) */}
                    <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="px-6 py-4">Paciente</th>
                                    <th className="px-6 py-4">Obra Social</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Acciones Rápidas</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPatients.map(patient => (
                                    <tr
                                        key={patient.id}
                                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => handleOpenSheet(patient)}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{patient.name}</div>
                                                    {patient.alias && <div className="text-slate-400 text-[11px] mt-0.5 font-medium uppercase tracking-tight">"{patient.alias}"</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-medium">
                                                {patient.insurance || "Particular"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-5 space-y-1.5 text-slate-600">
                                            {patient.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {patient.phone}
                                                </div>
                                            )}
                                            {patient.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {patient.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                {patient.phone && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 rounded-lg shadow-sm"
                                                        asChild
                                                        title="WhatsApp"
                                                    >
                                                        <a href={`https://wa.me/${patient.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                                                            <MessageSquare className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg shadow-sm"
                                                    onClick={() => handleOpenSheet(patient)}
                                                >
                                                    Ver Ficha
                                                </Button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={(e) => handleEdit(patient, e)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => handleDelete(patient, e)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
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

            <PatientForm
                open={formOpen}
                onOpenChange={setFormOpen}
                initialData={selectedPatient}
            />

            <PatientSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                patient={selectedPatient}
            />
        </div>
    );
}
