import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';

import { ThemeProvider } from './context/ThemeContext';

import OfflineBanner from './components/OfflineBanner';

import Login from './pages/Login';
import Home from './pages/Home';
import Bizum from './pages/Bizum';
import Bets from './pages/Bets';
import Contacts from './pages/Contacts';
import Loans from './pages/Loans';
import Settings from './pages/Settings';

import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminLoans from './pages/admin/AdminLoans';
import AdminPredictions from './pages/admin/AdminPredictions';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <OfflineBanner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/bizum" element={<Bizum />} />
              <Route path="/apuestas" element={<Bets />} />
              <Route path="/contactos" element={<Contacts />} />
              <Route path="/prestamos" element={<Loans />} />
              <Route path="/ajustes" element={<Settings />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="prestamos" element={<AdminLoans />} />
              <Route path="predicciones" element={<AdminPredictions />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      
    </AuthProvider>
  );
}