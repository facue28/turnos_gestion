import { getAppointmentsToday, updateAppointmentStatus, updateAppointmentPaymentStatus } from "@/app/actions/appointments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Phone, MapPin, Video, CheckCircle2, User, PlusCircle, AlertCircle, CreditCard, MoreVertical, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppointmentActions } from "./components/AppointmentActions";

export const metadata = {
    title: "Hoy | Centro de Comando Diario",
    description: "Tus turnos del día",
};

export default async function TodayPage() {
    const todayAppointments = await getAppointmentsToday();

    // Filtramos los cancelados o reprogramados para limpiar la vista por defecto
    const activeAppointments = todayAppointments.filter(
        (app) => app.status !== "Cancelada" && app.status !== "Reprogramada"
    );

    const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

    return (
        <div className="max-w-4xl mx-auto pb-16 space-y-8 animate-in fade-in duration-500">
            {/* Header: Diseño limpio y con espacio */}
            <header className="mb-10 text-center md:text-left space-y-2 mt-4 md:mt-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                    Centro de Comando
                </h1>
                <p className="text-lg text-slate-500 capitalize font-medium">
                    {todayFormatted}
                </p>
            </header>

            {/* Lista o Empty State */}
            {activeAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <User className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">No tienes turnos pendientes hoy</h3>
                    <p className="text-slate-500 text-center max-w-sm mb-6">
                        Aprovecha este tiempo para revisar configuraciones, organizar la semana o descansar.
                    </p>
                    <Button asChild className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
                        <Link href="/calendario">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ir al Calendario
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {activeAppointments.map((app) => {
                        const isCompleted = app.status === "Realizada";
                        const start = new Date(app.start_at);
                        const end = new Date(app.end_at);

                        return (
                            <Card
                                key={app.id}
                                className={`overflow-hidden transition-all duration-300 border-l-4 ${isCompleted
                                    ? 'border-l-emerald-500 bg-slate-50 opacity-75'
                                    : 'border-l-indigo-500 hover:shadow-md bg-white'
                                    }`}
                            >
                                <CardContent className="p-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">

                                        {/* Información Principal */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1">
                                            {/* Hora */}
                                            <div className="flex flex-col items-start sm:items-center min-w-[100px]">
                                                <span className="text-2xl font-bold text-slate-800">
                                                    {format(start, "HH:mm")}
                                                </span>
                                                <div className="flex items-center text-xs text-slate-500 mt-1 font-medium">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {format(end, "HH:mm")}
                                                </div>
                                            </div>

                                            {/* Vínculo vertical o divisor horizontal según pantalla */}
                                            <div className="hidden sm:block w-px h-12 bg-slate-200"></div>

                                            {/* Paciente y Detalles */}
                                            <div className="space-y-2 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className={`text-lg font-semibold ${isCompleted ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                                                        {app.patient?.name || "Paciente Sin Nombre"}
                                                    </h3>
                                                    {isCompleted && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            Completado
                                                        </Badge>
                                                    )}
                                                    {app.pay_status === 'Cobrado' && (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            Cobrado
                                                        </Badge>
                                                    )}
                                                    {app.pay_status === 'Parcial' && (
                                                        <div className="flex gap-2 items-center">
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                Cobro Parcial
                                                            </Badge>
                                                            {app.price > 0 && app.price > app.paid_amount && (
                                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-medium">
                                                                    <Wallet className="w-3 h-3" />
                                                                    Debe: ${app.price - app.paid_amount}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                    {app.pay_status === 'Pendiente' && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                            Falta Cobrar (${app.price})
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                                                        {app.modality === 'virtual' ? <Video className="w-4 h-4 text-indigo-500" /> : <MapPin className="w-4 h-4 text-amber-500" />}
                                                        <span className="capitalize font-medium">{app.modality}</span>
                                                    </div>

                                                    {app.patient?.phone && (
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Phone className="w-4 h-4" />
                                                            <a href={`tel:${app.patient.phone}`} className="hover:text-indigo-600 transition-colors">
                                                                {app.patient.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex justify-end items-end gap-2 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <AppointmentActions appointment={app} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
