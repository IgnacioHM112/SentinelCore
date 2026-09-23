import { useAuth } from '../../context/AuthContext';

export default function Header({ onMenuClick }) {
  const { usuario, logout } = useAuth();

  const iniciales = usuario?.nombre
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-600 hover:text-gray-900 text-xl cursor-pointer"
        aria-label="Abrir menú"
      >
        ☰
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
            {usuario?.rol === 'admin' ? 'Admin' : 'Encargado'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            title="Cerrar sesión"
          >
            {iniciales}
          </button>
        </div>
      </div>
    </header>
  );
}