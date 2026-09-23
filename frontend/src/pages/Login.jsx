import { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/Logo01b.png';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[Login] Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
  }, []);

  const onSuccess = async (credentialResponse) => {
    console.log('[Login] Google Success, enviando a backend...');
    try {
      const res = await fetch('http://localhost:18000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      const data = await res.json();
      console.log('[Login] Respuesta backend:', res.status, data);
      if (res.ok) {
        login(data.token, data.usuario);
      } else {
        setError(data.error || 'Error al autenticar');
      }
    } catch (err) {
      console.error('[Login] Error de red:', err);
      setError('Error de conexión');
    }
  };

  const onError = (err) => {
    console.error('[Login] Google Error:', err);
    setError('Error en Google Sign-In');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <img src={Logo} alt="SentinelCore" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">SentinelCore</h1>
          <p className="text-gray-500 mt-1">Sistema de Gestión de Turnos</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="space-y-4">
          <GoogleLogin
            onSuccess={onSuccess}
            onError={onError}
            disabled={!!error}
            useOneTap={false}
            theme="outline"
            size="large"
            logoAlignment="left"
            className="w-full"
          />

          <p className="text-center text-xs text-gray-400">
            Solo cuentas autorizadas (dominio de la empresa)
          </p>
        </div>
      </div>
    </div>
  );
}