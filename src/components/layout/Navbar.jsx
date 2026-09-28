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
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-3xl border border-line bg-surface/80 p-1.5 backdrop-blur-xl">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition ${
                isActive ? 'bg-surface-2 text-accent' : 'text-muted hover:text-ink'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}