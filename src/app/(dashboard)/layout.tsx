import { Navigation } from "@/components/Navigation";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            <Navigation />

            {/* Main content area, with padding to offset the fixed sidebar on desktop and bottom nav on mobile */}
            <main className="flex-1 md:ml-64 pb-16 md:pb-0">
                <div className="p-4 md:p-8 max-w-5xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
