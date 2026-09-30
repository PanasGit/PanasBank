import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Landmark, Target, ArrowLeft } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/prestamos', label: 'Préstamos', icon: Landmark },
  { to: '/admin/predicciones', label: 'Predicciones', icon: Target },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-app text-ink lg:flex">
      <aside className="border-b border-line bg-surface p-4 lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <div>
            <p className="font-display text-lg font-semibold">PanasBank</p>
            <p className="text-xs text-muted">Panel de administración</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:text-ink lg:mt-6 lg:w-full lg:justify-center"
          >
            <ArrowLeft size={14} />
            Volver a la app
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:mt-2 lg:flex-col lg:overflow-visible">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}