import { getPlatformTenants } from "../actions/admin";
import { AdminTenantList } from "@/features/admin/components/AdminTenantList";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const tenants = await getPlatformTenants();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Clínicas Registradas</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestiona el acceso de tus clientes (inactiva, revoca o invita nuevos profesionales)
                    </p>
                </div>
            </div>

            <AdminTenantList initialTenants={tenants} />
        </div>
    );
}
