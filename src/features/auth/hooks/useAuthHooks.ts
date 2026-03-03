"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import { LoginCredentials } from "../types/auth.types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useLogin = () => {
    const router = useRouter();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
        onSuccess: () => {
            router.push("/calendario");
        },
        onError: (error) => {
            console.error("Login falló:", error);
            toast.error("Credenciales inválidas. Por favor intenta nuevamente.");
        }
    });
};
