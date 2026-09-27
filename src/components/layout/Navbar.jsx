import { NavLink } from 'react-router-dom';
import { Home, ArrowLeftRight, Dice5, Landmark, Settings } from 'lucide-react';

const links = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/bizum', label: 'Bizum', icon: ArrowLeftRight },
  { to: '/apuestas', label: 'Apuestas', icon: Dice5 },
  { to: '/prestamos', label: 'Préstamos', icon: Landmark },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-dark-card/95">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-2 py-2 sm:px-6">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium transition ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}