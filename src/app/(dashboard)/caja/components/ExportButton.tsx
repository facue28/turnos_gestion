"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as xlsx from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ExportButtonProps {
    transactions: any[];
    appointments: any[];
    startDate: Date;
    endDate: Date;
}

export function ExportButton({ transactions, appointments, startDate, endDate }: ExportButtonProps) {
    const handleExport = () => {
        const fromStr = format(startDate, "yyyy-MM-dd");
        const toStr = format(endDate, "yyyy-MM-dd");
        const fileName = `Reporte_${fromStr}_${toStr}.xlsx`;

        // =======================
        // HOJA 1: Ingresos
        // =======================
        const ingresosData = transactions.map(t => {
            const appointmentPrice = t.appointment?.price ? Number(t.appointment.price) : Number(t.amount);
            const amountPaid = Number(t.amount);
            const missing = Math.max(0, appointmentPrice - amountPaid);

            return {
                "Fecha": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
                "Paciente": t.patient?.name || "N/A",
                "Descripción": t.description || "",
                "Tipo": t.type.toUpperCase(),
                "Método de Pago": t.method.replace(/_/g, ' ').toUpperCase(),
                "Saldo Pendiente": missing > 0 ? missing : 0,
                "Monto Cobrado": amountPaid
            };
        });

        // =======================
        // HOJA 2: Reporte de Turnos
        // =======================
        const turnosData = appointments.map((app: any) => {
            const patient = Array.isArray(app.patient) ? app.patient[0] : app.patient;

            const statusLabels: Record<string, string> = {
                'Realizada': '✅ Realizada',
                'Cancelada': '❌ Cancelada',
                'No_asistio': '⚠️ No Asistió',
                'Nueva': '🕐 Nueva',
                'Confirmada': '✔️ Confirmada',
                'Reprogramada': '🔄 Reprogramada'
            };

            const payLabels: Record<string, string> = {
                'Cobrado': 'Cobrado',
                'Pendiente': 'Pendiente',
                'Parcial': 'Cobro Parcial',
                'OS_pendiente': 'OS Pendiente'
            };

            return {
                "Fecha": format(new Date(app.start_at), "dd/MM/yyyy", { locale: es }),
                "Hora": format(new Date(app.start_at), "HH:mm"),
                "Día": format(new Date(app.start_at), "EEEE", { locale: es }),
                "Paciente": patient?.name || "N/A",
                "Modalidad": app.modality === 'presencial' ? 'Presencial' : 'Virtual',
                "Estado del Turno": statusLabels[app.status] || app.status,
                "Estado de Pago": payLabels[app.pay_status] || app.pay_status,
                "Precio ($)": app.price || 0
            };
        });

        // =======================
        // Construir Workbook
        // =======================
        const wb = xlsx.utils.book_new();

        const wsIngresos = xlsx.utils.json_to_sheet(ingresosData);
        wsIngresos["!cols"] = [
            { wch: 18 }, { wch: 22 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 16 }, { wch: 15 }
        ];
        xlsx.utils.book_append_sheet(wb, wsIngresos, "Ingresos");

        const wsTurnos = xlsx.utils.json_to_sheet(turnosData);
        wsTurnos["!cols"] = [
            { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
        ];
        xlsx.utils.book_append_sheet(wb, wsTurnos, "Reporte de Turnos");

        xlsx.writeFile(wb, fileName);
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={!transactions || transactions.length === 0}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-emerald-700 bg-white border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-sm"
        >
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
        </Button>
    );
}
