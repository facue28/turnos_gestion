import { useMutation } from "@tanstack/react-query";
import { authService } from "../services/authService";
import { LoginCredentials } from "../types/auth.types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
        onSuccess: () => {
            navigate("/dashboard");
        },
        onError: (error) => {
            console.error("Login falló:", error);
            toast.error("Credenciales inválidas. Por favor intenta nuevamente.");
        }
    });
};
