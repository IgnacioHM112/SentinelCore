import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:18000/api';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarUsuario = useCallback(async () => {
    const token = localStorage.getItem('token');
    console.log('[Auth] Token en localStorage:', token ? 'SÍ' : 'NO');
    if (!token) {
      console.log('[Auth] Sin token, marcando cargando=false');
      setCargando(false);
      return;
    }
    try {
      console.log('[Auth] Validando token con /auth/me...');
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Auth] Respuesta /auth/me:', res.status, res.statusText);
      if (res.ok) {
        const data = await res.json();
        console.log('[Auth] Usuario cargado:', data);
        setUsuario(data);
      } else {
        console.log('[Auth] Token inválido, removiendo');
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('[Auth] Error de red:', err);
      localStorage.removeItem('token');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuario();
  }, [cargarUsuario]);

  const login = (token, userData) => {
    console.log('[Auth] Login:', userData);
    localStorage.setItem('token', token);
    setUsuario(userData);
  };

  const logout = () => {
    console.log('[Auth] Logout');
    localStorage.removeItem('token');
    setUsuario(null);
  };

  const value = { usuario, login, logout, cargando, recargar: cargarUsuario };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}