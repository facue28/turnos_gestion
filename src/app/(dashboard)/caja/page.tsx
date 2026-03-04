import { getFinancialMetrics, getRecentTransactions } from "@/app/actions/payments";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { ExportButton } from "./components/ExportButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
    title: "Caja | Centro de Finanzas",
    description: "Tablero principal de Caja y Pagos",
};

export default async function CajaPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const params = await props.searchParams;
    const fromParam = params.from as string | undefined;
    const toParam = params.to as string | undefined;

    // 1. Calcular fechas
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let startDate = firstDay;
    let endDate = lastDay;

    if (fromParam) {
        const parsedFrom = parse(fromParam, "yyyy-MM-dd", new Date());
        if (isValid(parsedFrom)) startDate = parsedFrom;
    }

    if (toParam) {
        const parsedTo = parse(toParam, "yyyy-MM-dd", new Date());
        if (isValid(parsedTo)) endDate = parsedTo;
    }

    // Extender endDate al final del día para la consulta
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Fetch data
    const [metrics, transactions] = await Promise.all([
        getFinancialMetrics(startDate, endOfDay),
        getRecentTransactions(startDate, endOfDay)
    ]);

    return (
        <div className="max-w-6xl mx-auto pb-16 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-4 md:mt-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Caja
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Resumen de ingresos y saldos pendientes.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <DateRangeFilter />
                    <ExportButton transactions={transactions} startDate={startDate} endDate={endDate} />
                </div>
            </header>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md border-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-indigo-100 text-sm font-medium">Ingresos del Período</CardTitle>
                        <TrendingUp className="h-5 w-5 text-indigo-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${metrics.ingresosPeriodo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-indigo-200 mt-1">
                            {format(startDate, "d MMM", { locale: es })} al {format(endDate, "d MMM yyyy", { locale: es })}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-amber-200 shadow-sm border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-amber-700 text-sm font-medium">Deuda Total Histórica</CardTitle>
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">${metrics.deudaTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Saldo total sin cobrar de turnos realizados o ausentes.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tranasactions Table */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-slate-50/50">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <CircleDollarSign className="w-5 h-5 text-slate-500" />
                        Historial de Transacciones
                    </h2>
                </div>

                {transactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-medium text-slate-900">No hay movimientos</p>
                        <p className="text-sm">No se registraron ingresos en el período seleccionado.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Fecha</th>
                                    <th className="px-6 py-4 font-medium">Paciente</th>
                                    <th className="px-6 py-4 font-medium">Descripción</th>
                                    <th className="px-6 py-4 font-medium text-center">Método</th>
                                    <th className="px-6 py-4 font-medium text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions.map((t: any) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            {format(new Date(t.created_at), "dd/MM/yyyy HH:mm")}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {t.patient?.name || "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {t.description || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-600 capitalize border border-slate-200 shadow-sm">
                                                {t.method.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                                            +${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
