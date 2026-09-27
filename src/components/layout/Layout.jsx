import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-dark-bg">
      <Outlet />
      <Navbar />
    </div>
  );
}