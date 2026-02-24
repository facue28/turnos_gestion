export default function HoyPage() {
    return (
        <div className="space-y-6">
            <header>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hoy</h2>
                <p className="text-sm text-slate-500 mt-1">Resumen de tu jornada</p>
            </header>

            <section className="bg-white rounded-xl shadow-sm border p-6">
                <p className="text-slate-500 text-sm">
                    No hay turnos para visualizar aún.
                </p>
            </section>
        </div>
    );
}
