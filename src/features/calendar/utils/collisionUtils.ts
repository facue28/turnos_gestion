import { areIntervalsOverlapping, parse, getDay } from "date-fns";
import { BlockData, AvailabilityData } from "../../settings/types/settings.types";

/**
 * Checks if a given interval overlaps with any permanent blocks.
 */
export const checkBlockCollision = (start: Date, end: Date, blocks: BlockData[]) => {
    return blocks.some(block => {
        const blockStart = new Date(block.start_at);
        const blockEnd = new Date(block.end_at);
        return areIntervalsOverlapping(
            { start, end },
            { start: blockStart, end: blockEnd }
        );
    });
};

/**
 * Checks if a given interval is outside the professional's weekly availability.
 * A collision (true) means it is OUTSIDE the allowed hours.
 */
export const checkAvailabilityCollision = (start: Date, end: Date, availability: AvailabilityData[]) => {
    const dayOfWeek = getDay(start); // 0 (Sun) to 6 (Sat)
    const dayAvailability = availability.filter(a => a.weekday === dayOfWeek);

    if (dayAvailability.length === 0) return true; // No schedule defined for this day

    // Check if the interval is fully contained within at least one availability slot
    const isContained = dayAvailability.some(slot => {
        const slotStart = parse(slot.start_time, "HH:mm:ss", start);
        const slotEnd = parse(slot.end_time, "HH:mm:ss", start);

        return (start >= slotStart && end <= slotEnd);
    });

    return !isContained;
};

/**
 * Master collision check: Returns true if there is a conflict.
 */
export const detectCollision = (start: Date, end: Date, blocks: BlockData[], availability: AvailabilityData[]) => {
    const inBlock = checkBlockCollision(start, end, blocks);
    const outsideAvailability = checkAvailabilityCollision(start, end, availability);

    return inBlock || outsideAvailability;
};
