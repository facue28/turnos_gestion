import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const NumberInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
    ({ className, ...props }, ref) => {
        const handleIncrement = (e: React.MouseEvent) => {
            e.preventDefault();
            // Locate the input element inside the relative wrapper
            const input = (e.currentTarget as HTMLButtonElement).parentElement?.parentElement?.querySelector('input');
            if (input) {
                input.stepUp();
                // Trigger React onChange
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(input, input.value);
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        };

        const handleDecrement = (e: React.MouseEvent) => {
            e.preventDefault();
            const input = (e.currentTarget as HTMLButtonElement).parentElement?.parentElement?.querySelector('input');
            if (input) {
                input.stepDown();
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(input, input.value);
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        };

        return (
            <div className="relative flex items-center w-full">
                <Input
                    type="number"
                    className={cn(
                        "pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                <div className="absolute right-1 flex flex-col h-[calc(100%-8px)] py-0.5 w-6 opacity-60 hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        className="flex-1 flex items-center justify-center rounded-t-[0.15rem] bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={handleIncrement}
                        tabIndex={-1}
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <div className="h-[1px] w-full bg-border/40" />
                    <button
                        type="button"
                        className="flex-1 flex items-center justify-center rounded-b-[0.15rem] bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        onClick={handleDecrement}
                        tabIndex={-1}
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        )
    }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
