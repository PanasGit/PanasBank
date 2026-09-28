import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-app pb-28 text-ink">
      <div className="mx-auto w-full max-w-2xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Outlet />
      </div>
      <Navbar />
    </div>
  );
}