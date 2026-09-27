import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import Login from './pages/Login';
import Home from './pages/Home';
import Bizum from './pages/Bizum';
import Bets from './pages/Bets';
import Contacts from './pages/Contacts';
import Loans from './pages/Loans';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/bizum" element={<ProtectedRoute><Bizum /></ProtectedRoute>} />
          <Route path="/apuestas" element={<ProtectedRoute><Bets /></ProtectedRoute>} />
          <Route path="/contactos" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="/prestamos" element={<ProtectedRoute><Loans /></ProtectedRoute>} />
          <Route path="/ajustes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}