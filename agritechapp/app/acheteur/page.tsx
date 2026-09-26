'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ClipboardList, Users, ShoppingCart } from 'lucide-react';

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
            <h1 className="text-2xl font-bold text-purple-800 flex-1">Espace Acheteur</h1>
            <button
              onClick={() => router.push('/')}
              className="text-red-600 hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>

          <p className="text-gray-600 mb-6">Publiez vos demandes d&apos;achat et contactez les producteurs.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/acheteur/annonces')}
              className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <ClipboardList className="w-8 h-8 mb-2" aria-hidden="true" />
              <div className="font-semibold">Mes annonces</div>
              <div className="text-sm opacity-90">Publier et gérer vos demandes</div>
            </button>

            <button
              onClick={() => router.push('/acheteur/contacts')}
              className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <Users className="w-8 h-8 mb-2" aria-hidden="true" />
              <div className="font-semibold">Producteurs contactés</div>
              <div className="text-sm opacity-90">Réponses reçues</div>
            </button>

            <button
              onClick={() => router.push('/acheteur/commandes')}
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <ShoppingCart className="w-8 h-8 mb-2" aria-hidden="true" />
              <div className="font-semibold">Mes commandes</div>
              <div className="text-sm opacity-90">Livraisons et paiements</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
