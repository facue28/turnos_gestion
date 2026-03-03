import { AppointmentData } from "../types/calendar.types";
import { addMinutes, isBefore, subMinutes } from "date-fns";

/**
 * Checks if an appointment is "expired" and needs recategorization.
 * Rule: status is 'Nueva' AND (endTime + 15 minutes) < now.
 */
export const isAppointmentExpired = (appointment: AppointmentData): boolean => {
    if (appointment.status !== 'Nueva') return false;

    const endTime = new Date(appointment.end_at);
    const threshold = addMinutes(endTime, 15);
    const now = new Date();

    return isBefore(threshold, now);
};

/**
 * Calculates the remaining balance of an appointment.
 */
export const calculateBalance = (appointment: AppointmentData): number => {
    const total = appointment.price || 0;
    const paid = appointment.paid_amount || 0;
    return Math.max(0, total - paid);
};

/**
 * Gets the color for a specific status badge.
 */
export const getStatusColor = (status: string) => {
    switch (status) {
        case 'Nueva': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Realizada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Cancelada': return 'bg-red-100 text-red-700 border-red-200';
        case 'No_asistio': return 'bg-slate-100 text-slate-700 border-slate-200';
        case 'Reprogramada': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

/**
 * Gets the color for a pay status badge.
 */
export const getPayStatusColor = (status: string) => {
    switch (status) {
        case 'Cobrado': return 'bg-emerald-500 text-white';
        case 'Pendiente': return 'bg-amber-500 text-white';
        case 'Parcial': return 'bg-blue-500 text-white';
        case 'OS_pendiente': return 'bg-purple-500 text-white';
        default: return 'bg-gray-500 text-white';
    }
};
