import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PostGenerator() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
            ← Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Générateur</h1>
          <button onClick={signOut} className="text-gray-600 hover:text-gray-900">
            Déconnexion
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-md p-8">
          <p className="text-gray-600">Générateur - En construction 🚧</p>
        </div>
      </main>
    </div>
  );
}
