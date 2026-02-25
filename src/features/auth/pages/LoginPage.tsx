import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginCredentials } from "../types/auth.types";
import { useLogin } from "../hooks/useAuthHooks";
import { LogIn } from "lucide-react";

export default function LoginPage() {
    const { mutate: login, isPending } = useLogin();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginCredentials>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = (data: LoginCredentials) => {
        login(data);
    };

    const handleDemoLogin = () => {
        const demoEmail = import.meta.env.VITE_DEMO_EMAIL;
        const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;

        if (!demoEmail || !demoPassword) {
            console.error("Faltan credenciales demo en las variables de entorno");
            return;
        }

        login({ email: demoEmail, password: demoPassword });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Agenda<span className="text-indigo-600">+Caja</span>
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Inicia sesión para gestionar tu consultorio
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            {...register("email")}
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            placeholder="tu@email.com"
                        />
                        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            type="password"
                            {...register("password")}
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        <LogIn size={18} />
                        {isPending ? "Iniciando..." : "Ingresar"}
                    </button>
                </form>

                <div className="mt-8 relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400">Modo de Prueba</span>
                    </div>
                </div>

                <button
                    onClick={handleDemoLogin}
                    type="button"
                    disabled={isPending}
                    className="mt-4 w-full bg-slate-100 text-slate-700 border border-slate-200 py-2.5 rounded-md font-medium hover:bg-slate-200 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                    Acceder a Cuenta Demo
                </button>
            </div>
        </div>
    );
}
