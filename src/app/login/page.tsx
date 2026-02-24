import { login, loginWithDemo } from "@/app/actions/auth";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const resolvedParams = await searchParams;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="w-full max-w-sm space-y-6 bg-white p-8 rounded-2xl shadow-sm border">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Agenda<span className="text-indigo-600">+Caja</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-2">
                        Ingresá a tu cuenta para gestionar tus turnos.
                    </p>
                </div>

                <form action={login} className="space-y-4">
                    {resolvedParams?.error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center border border-red-100">
                            Credenciales incorrectas
                        </div>
                    )}
                    {resolvedParams?.error === "demo_not_configured" && (
                        <div className="bg-amber-50 text-amber-600 text-sm p-3 rounded-md text-center border border-amber-100">
                            Modo Demo no configurado (.env)
                        </div>
                    )}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="tu@email.com"
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        Ingresar
                    </button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">O probá la app</span>
                    </div>
                </div>

                <form action={loginWithDemo}>
                    <button
                        type="submit"
                        className="w-full bg-slate-50 text-slate-700 border border-slate-200 font-medium py-2.5 rounded-md hover:bg-slate-100 transition-colors"
                    >
                        Entrar con Demo
                    </button>
                </form>
            </div>
        </div>
    );
}
