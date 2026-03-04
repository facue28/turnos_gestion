import { createClient } from "@/utils/supabase/server";
import { getPatientHistory } from "@/app/actions/appointments";
import { getPatientBalance } from "@/app/actions/payments";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, WalletCards, Calendar } from "lucide-react";
import { redirect } from "next/navigation";

export default async function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1. Fetch patient data
    const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('professional_id', user.id)
        .single();

    if (patientError || !patient) {
        redirect('/pacientes');
    }

    // 2. Fetch debt and complete history
    const balanceData = await getPatientBalance(id, true);
    const historyData = await getPatientHistory(id);

    return (
        <div className="flex-1 w-full flex flex-col items-center bg-slate-50 min-h-screen">
            <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/pacientes">
                        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{patient.name}</h1>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
                            {patient.phone ? (
                                <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {patient.phone}</span>
                            ) : (
                                <span className="flex items-center gap-1.5 opacity-50"><Phone className="w-4 h-4" /> Sin teléfono</span>
                            )}
                            {patient.email ? (
                                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {patient.email}</span>
                            ) : (
                                <span className="flex items-center gap-1.5 opacity-50"><Mail className="w-4 h-4" /> Sin email</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Resumen Financiero */}
                <Card className="border-indigo-100 shadow-sm overflow-hidden">
                    <div className="h-2 w-full bg-indigo-600" />
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-medium flex items-center gap-2 text-indigo-900">
                            <WalletCards className="w-5 h-5 text-indigo-500" />
                            Estado de Cuenta
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-black text-slate-800 tracking-tighter">
                                    ${balanceData.debt?.toLocaleString("es-AR") || 0}
                                </p>
                                <p className="text-sm font-medium text-slate-500 mt-1">Saldo adeudado</p>
                            </div>
                            {balanceData.debt && balanceData.debt > 0 ? (
                                <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 px-3 py-1">
                                    Con Deuda
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1">
                                    Al Día
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Historial */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="border-b bg-slate-50/50">
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            Historial Completo de Turnos
                        </CardTitle>
                    </CardHeader>
                    {historyData && historyData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50">
                                    <TableHead className="font-semibold text-slate-600">Fecha</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Modalidad</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Estado</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Pago</TableHead>
                                    <TableHead className="font-semibold text-slate-600 text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyData.map((app) => (
                                    <TableRow key={app.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">
                                                    {format(parseISO(app.start_at), "dd MMM yyyy", { locale: es })}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {format(parseISO(app.start_at), "HH:mm")} hs
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-slate-50 border-slate-200 text-slate-500">
                                                {app.modality}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {app.status === 'Realizada' && <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Realizada</Badge>}
                                            {app.status === 'No_asistio' && <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">No asistió</Badge>}
                                            {(app.status === 'Cancelada' || app.status === 'Reprogramada') && <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">{app.status}</Badge>}
                                            {(app.status === 'Nueva' || app.status === 'Confirmada') && <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200">{app.status}</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {app.pay_status === 'Cobrado' ? <span className="w-2 h-2 rounded-full bg-emerald-500"></span> : <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                                                <span className="text-sm text-slate-600 capitalize">{app.pay_status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-slate-700">
                                            ${app.price?.toLocaleString("es-AR") || 0}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <p>No hay turnos registrados en el historial de este paciente.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
