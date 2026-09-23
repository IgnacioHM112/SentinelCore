import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Planificacion from './pages/Planificacion';
import ObjetivosPuestos from './pages/ObjetivosPuestos';
import TurnosConfig from './pages/TurnosConfig';
import Vigiladores from './pages/Vigiladores';
import Requerimientos from './pages/Requerimientos';

function AppRoutes() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  console.log('[AppRoutes] cargando:', cargando, 'usuario:', usuario, 'pathname:', location.pathname);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Si está logueado e intenta ir a /login, redirigir a /
  if (usuario && location.pathname === '/login') {
    console.log('[AppRoutes] Logueado en /login -> redirect /');
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas - PrivateRoute envuelve Layout + páginas */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planificacion" element={<Planificacion />} />
        <Route path="/objetivos-puestos" element={<ObjetivosPuestos />} />
        <Route path="/turnos" element={<TurnosConfig />} />
        <Route path="/vigiladores" element={<Vigiladores />} />
        <Route path="/requerimientos" element={<Requerimientos />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  console.log('[App] VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com'}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}