"use client";

import { Navigation } from "@/components/Navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <Navigation />
            <main className="flex-1 w-full md:pl-64">
                <div className="p-4 md:p-8 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
