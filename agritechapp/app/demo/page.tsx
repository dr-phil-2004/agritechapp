'use client';

import { useRouter } from 'next/navigation';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo123';

const personas = [
  {
    id: 'bio',
    name: 'Bio',
    role: 'producteur',
    description: 'Producteur smartphone, N\'Dali, parle bariba',
    phone: '22941000001',
    code: '123456',
    color: 'bg-green-600',
  },
  {
    id: 'adjara',
    name: 'Adjara',
    role: 'producteur',
    description: 'Producteur téléphone basique, près de N\'Dali, parle bariba',
    phone: '22941000002',
    code: '000000',
    color: 'bg-orange-600',
  },
  {
    id: 'serge',
    name: 'Serge',
    role: 'conseiller',
    description: 'Conseiller agricole, Parakou',
    email: 'serge@agriveille.bj',
    password: 'Conseil1',
    color: 'bg-blue-600',
  },
  {
    id: 'houenou',
    name: 'Mme Houénou',
    role: 'acheteur',
    description: 'Commerçante de céréales, Parakou',
    phone: '22941000003',
    code: '123456',
    color: 'bg-purple-600',
  },
  {
    id: 'admin',
    name: 'Admin',
    role: 'admin',
    description: 'Direction départementale',
    email: 'admin@agriveille.bj',
    password: 'Admin2026',
    color: 'bg-gray-600',
  },
];

export default function DemoPage() {
  const router = useRouter();

  const handlePersonaLogin = (persona: typeof personas[0]) => {
    // Rediriger directement selon le rôle pour la démo
    switch (persona.role) {
      case 'producteur':
        router.push('/producteur');
        break;
      case 'conseiller':
        router.push('/conseiller');
        break;
      case 'acheteur':
        router.push('/acheteur');
        break;
      case 'admin':
        router.push('/admin');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3" aria-hidden="true">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">
                Données fictives — téléphonie simulée
              </p>
              <p className="text-yellow-700 text-sm">
                Cette démo utilise des données de test et une simulation des appels/SMS.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-green-800 mb-2">
            AgriVeille - Démo
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Sélectionnez un persona pour tester l'application
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => handlePersonaLogin(persona)}
                className={`${persona.color} text-white p-6 rounded-xl hover:opacity-90 transition-opacity text-left`}
              >
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                    {persona.role === 'producteur' ? '👨‍🌾' : 
                     persona.role === 'conseiller' ? '👨‍💼' :
                     persona.role === 'acheteur' ? '👩‍💼' : '👨‍💼'}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold text-lg">{persona.name}</h3>
                    <p className="text-sm opacity-90 capitalize">{persona.role}</p>
                  </div>
                </div>
                <p className="text-sm opacity-90">{persona.description}</p>
                <div className="mt-4 pt-4 border-t border-white/20 text-xs font-mono space-y-0.5">
                  {'email' in persona
                    ? <><p>{persona.email}</p><p>Mot de passe : {(persona as {password?: string}).password}</p></>
                    : <><p>N° {(persona as {phone?: string}).phone}</p><p>Code : {(persona as {code?: string}).code}</p></>
                  }
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Retour à la page de connexion
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Mode démo : accès direct aux espaces sans authentification</p>
        </div>
      </div>
    </div>
  );
}
