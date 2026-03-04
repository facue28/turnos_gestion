"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { format, isValid, parse } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

export function DateRangeFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Initialize state properly
    const [date, setDate] = useState<DateRange | undefined>(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        let fromDate = firstDay;
        let toDate = lastDay;

        if (fromParam) {
            const parsedFrom = parse(fromParam, "yyyy-MM-dd", new Date());
            if (isValid(parsedFrom)) fromDate = parsedFrom;
        }

        if (toParam) {
            const parsedTo = parse(toParam, "yyyy-MM-dd", new Date());
            if (isValid(parsedTo)) toDate = parsedTo;
        }

        return { from: fromDate, to: toDate };
    });

    // Update URL only when explicitly setting a valid range
    const handleSetDate = (newDate: DateRange | undefined) => {
        setDate(newDate);

        if (newDate?.from && newDate?.to) {
            const params = new URLSearchParams(searchParams.toString());
            const newFrom = format(newDate.from, "yyyy-MM-dd");
            const newTo = format(newDate.to, "yyyy-MM-dd");

            if (newFrom !== fromParam || newTo !== toParam) {
                params.set("from", newFrom);
                params.set("to", newTo);

                // Important: Use scroll: false to avoid sudden page jumps and unmounting popovers
                router.push(`?${params.toString()}`, { scroll: false });
            }
        }
    };

    return (
        <DatePickerWithRange
            date={date}
            setDate={handleSetDate}
            className="w-full sm:w-[300px]"
        />
    );
}
