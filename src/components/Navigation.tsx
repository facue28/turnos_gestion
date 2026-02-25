import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Users, Settings, LogOut, Calendar, CircleDollarSign } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";

export function Navigation() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { label: 'Hoy', href: '/hoy', icon: CalendarDays },
    { label: 'Calendario', href: '/calendario', icon: Calendar },
    { label: 'Pacientes', href: '/pacientes', icon: Users },
    { label: 'Caja', href: '/caja', icon: CircleDollarSign },
    { label: 'Ajustes', href: '/ajustes', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r bg-white fixed top-0 left-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Agenda<span className="text-indigo-600">+Caja</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                <Icon size={20} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white flex justify-around items-center h-16 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? "text-indigo-600" : "text-slate-500"
                }`}
            >
              <Icon size={20} className={isActive ? "text-indigo-600" : "text-slate-400"} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
