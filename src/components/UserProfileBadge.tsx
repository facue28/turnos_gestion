"use client";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { UserCircle2 } from "lucide-react";

export function UserProfileBadge() {
    const { user } = useAuth();
    const { data: profile, isLoading } = useSettings(user?.id || null);

    if (isLoading || !user) {
        return (
            <div className="flex items-center gap-3 px-3 py-2 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    const displayName = profile?.full_name || user.email?.split('@')[0] || "Usuario";
    const displayProfession = profile?.profession || "Profesional";

    return (
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-md bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 bg-indigo-100 p-1.5 rounded-full text-indigo-600">
                <UserCircle2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-800 truncate">
                    {displayName}
                </span>
                <span className="text-xs font-medium text-slate-500 truncate">
                    {displayProfession}
                </span>
            </div>
        </div>
    );
}
