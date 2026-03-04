import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false);
    const [draftDate, setDraftDate] = React.useState<DateRange | undefined>(date);
    const [isMobile, setIsMobile] = React.useState(false);

    // Sync draft when external date changes
    React.useEffect(() => {
        setDraftDate(date);
    }, [date?.from?.toISOString(), date?.to?.toISOString()]);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleApply = () => {
        if (draftDate?.from && draftDate?.to) {
            setDate(draftDate);
            setOpen(false);
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "justify-start text-left font-normal min-h-[44px] md:min-h-0",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "d MMM", { locale: es })} -{" "}
                                    {format(date.to, "d MMM, yyyy", { locale: es })}
                                </>
                            ) : (
                                format(date.from, "d MMM, yyyy", { locale: es })
                            )
                        ) : (
                            <span>Seleccionar Fechas</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={draftDate?.from}
                        selected={draftDate}
                        onSelect={setDraftDate}
                        numberOfMonths={isMobile ? 1 : 2}
                        locale={es}
                        showOutsideDays={false}
                    />
                    {/* Apply footer */}
                    <div className="border-t p-3 flex items-center justify-between gap-3 bg-slate-50/70">
                        <p className="text-xs text-slate-500">
                            {draftDate?.from && draftDate?.to ? (
                                <>
                                    {format(draftDate.from, "d MMM", { locale: es })} → {format(draftDate.to, "d MMM, yyyy", { locale: es })}
                                </>
                            ) : draftDate?.from ? (
                                "Selecciona la fecha final"
                            ) : (
                                "Selecciona un rango"
                            )}
                        </p>
                        <Button
                            onClick={handleApply}
                            disabled={!draftDate?.from || !draftDate?.to}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 min-h-[44px] md:min-h-[36px]"
                        >
                            Aplicar
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
