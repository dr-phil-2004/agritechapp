'use client';

import { AuthService } from '@/domains/auth/auth-service';
import { useRouter } from 'next/navigation';

export default function ProducteurPage() {
  const router = useRouter();
  const authService = new AuthService();

  const handleLogout = async () => {
    await authService.logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-green-800">
              Espace Producteur
            </h1>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            Bienvenue dans votre espace producteur. Signalez des ravageurs et recevez des alertes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors">
              <div className="text-4xl mb-2">📸</div>
              <div className="font-semibold">Signaler</div>
              <div className="text-sm opacity-90">Photo + voix</div>
            </button>
            
            <button className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors">
              <div className="text-4xl mb-2">🔔</div>
              <div className="font-semibold">Alertes</div>
              <div className="text-sm opacity-90">Voir les alertes</div>
            </button>
            
            <button className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors">
              <div className="text-4xl mb-2">💰</div>
              <div className="font-semibold">Vendre</div>
              <div className="text-sm opacity-90">Mes annonces</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
