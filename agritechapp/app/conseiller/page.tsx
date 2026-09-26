'use client';

import { useRouter } from 'next/navigation';
import { Map, UserPlus, KeyRound, ArrowLeft, BookOpen } from 'lucide-react';

export default function ConseillerPage() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-2xl font-bold text-green-800 flex-1">
              Espace Conseiller
            </h1>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700"
            >
              Déconnexion
            </button>
          </div>
          <p className="text-gray-600 mb-6">
            Bienvenue, Serge. Gérez les producteurs de votre zone.
          </p>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/conseiller/carte')}
              className="bg-green-600 text-white p-5 rounded-xl hover:bg-green-700 transition-colors flex flex-col items-center gap-2 focus:outline-none focus:ring-4 focus:ring-green-300"
              aria-label="Ouvrir la carte des signalements phytosanitaires"
            >
              <Map className="w-8 h-8" aria-hidden="true" />
              <div className="font-semibold text-center">Carte des signalements</div>
              <div className="text-sm opacity-90 text-center">Temps réel</div>
            </button>

            <button
              onClick={() => router.push('/conseiller/inscrire')}
              className="bg-blue-600 text-white p-5 rounded-xl hover:bg-blue-700 transition-colors flex flex-col items-center gap-2 focus:outline-none focus:ring-4 focus:ring-blue-300"
              aria-label="Inscrire un producteur assisté"
            >
              <UserPlus className="w-8 h-8" aria-hidden="true" />
              <div className="font-semibold text-center">Inscrire un producteur</div>
              <div className="text-sm opacity-90 text-center">Inscription assistée</div>
            </button>

            <button
              className="bg-orange-600 text-white p-5 rounded-xl hover:bg-orange-700 transition-colors flex flex-col items-center gap-2 focus:outline-none focus:ring-4 focus:ring-orange-300"
              aria-label="Réinitialiser le code d'un producteur"
            >
              <KeyRound className="w-8 h-8" aria-hidden="true" />
              <div className="font-semibold text-center">Réinitialiser un code</div>
              <div className="text-sm opacity-90 text-center">Code producteur</div>
            </button>

            <button
              onClick={() => router.push('/conseiller/fiches')}
              className="bg-teal-600 text-white p-5 rounded-xl hover:bg-teal-700 transition-colors flex flex-col items-center gap-2 focus:outline-none focus:ring-4 focus:ring-teal-300"
              aria-label="Consulter les fiches ravageurs et réglementaires"
            >
              <BookOpen className="w-8 h-8" aria-hidden="true" />
              <div className="font-semibold text-center">Fiches de référence</div>
              <div className="text-sm opacity-90 text-center">Ravageurs, réglementation</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
