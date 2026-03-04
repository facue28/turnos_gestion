"use server";
export async function logToTerminal(message: string, data?: any) {
    if (data) {
        console.log(`[FRONTEND_DEBUG] ${message}`, JSON.stringify(data, null, 2));
    } else {
        console.log(`[FRONTEND_DEBUG] ${message}`);
    }
}
