'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function AcheteurPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-purple-800 flex-1">
              Espace Acheteur
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-red-600 hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>
          
          <p className="text-gray-600 mb-6">
            Bienvenue dans votre espace acheteur. Consultez les annonces et contactez les producteurs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors">
              <div className="text-4xl mb-2">📋</div>
              <div className="font-semibold">Annonces</div>
              <div className="text-sm opacity-90">Voir les annonces</div>
            </button>
            
            <button className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors">
              <div className="text-4xl mb-2">📞</div>
              <div className="font-semibold">Mes contacts</div>
              <div className="text-sm opacity-90">Producteurs contactés</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
