"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as xlsx from "xlsx";
import { format } from "date-fns";

interface ExportButtonProps {
    transactions: any[];
    startDate: Date;
    endDate: Date;
}

export function ExportButton({ transactions, startDate, endDate }: ExportButtonProps) {
    const handleExport = () => {
        const fromStr = format(startDate, "yyyy-MM-dd");
        const toStr = format(endDate, "yyyy-MM-dd");
        const fileName = `Finanzas_${fromStr}_${toStr}.xlsx`;

        const dataToExport = transactions.map(t => {
            const appointmentPrice = t.appointment?.price ? Number(t.appointment.price) : Number(t.amount);
            const amountPaid = Number(t.amount);
            const missing = Math.max(0, appointmentPrice - amountPaid);

            return {
                "Fecha": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
                "Paciente": t.patient?.name || "N/A",
                "Descripción": t.description || "",
                "Tipo": t.type.toUpperCase(),
                "Método": t.method.replace('_', ' ').toUpperCase(),
                "Falta": missing > 0 ? missing : 0,
                "Monto Ingreso": amountPaid
            };
        });

        const ws = xlsx.utils.json_to_sheet(dataToExport);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Transacciones");
        xlsx.writeFile(wb, fileName);
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={!transactions || transactions.length === 0}
            className="w-full sm:w-auto text-emerald-700 bg-white border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-sm"
        >
            <Download className="mr-2 h-4 w-4" />
            Excel
        </Button>
    );
}
