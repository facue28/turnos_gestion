import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; // Assuming Sonner is installed based on previous instructions

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // Datos se consideran frescos por 5 minutos
            retry: 1, // Reintenta 1 vez en caso de fallo de red
            refetchOnWindowFocus: false, // Evita refetching agresivo al cambiar de pestaña
        },
        mutations: {
            // Manejador global de errores para mutaciones
            onError: (error) => {
                console.error("Mutation Error:", error);
                toast.error("Ocurrió un error inesperado al procesar tu solicitud.");
            },
        }
    },
});
