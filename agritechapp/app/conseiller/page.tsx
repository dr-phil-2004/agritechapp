'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/domains/auth/auth-service';
import { db } from '@/db';
import { communes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default function ConseillerPage() {
  const router = useRouter();
  const [showInscriptionForm, setShowInscriptionForm] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    nom: '',
    langue: 'fr',
    aSmartphone: true,
    commune: '',
  });
  const [message, setMessage] = useState('');
  const [communesList, setCommunesList] = useState<any[]>([]);

  const authService = new AuthService();

  const handleLogout = async () => {
    await authService.logout();
    router.push('/');
  };

  const loadCommunes = async () => {
    const communesData = await db.select().from(communes);
    setCommunesList(communesData);
  };

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const commune = communesList.find(c => c.nom === formData.commune);
    if (!commune) {
      setMessage('Commune non trouvée');
      return;
    }

    // Position par défaut (centre de la commune)
    const position = JSON.stringify({
      type: 'Point',
      coordinates: [2.6, 9.3] // Coordonnées par défaut de Parakou
    });

    const result = await authService.createProducerAccount(
      formData.phone,
      formData.code,
      formData.nom,
      formData.langue,
      formData.aSmartphone,
      commune.id,
      position,
      1 // ID du conseiller (à remplacer par l'ID réel)
    );

    if (result.success) {
      setMessage('Producteur inscrit avec succès!');
      setFormData({
        phone: '',
        code: '',
        nom: '',
        langue: 'fr',
        aSmartphone: true,
        commune: '',
      });
    } else {
      setMessage(result.error || 'Erreur lors de l\'inscription');
    }
  };

  const handleResetCode = async (phone: string, newCode: string) => {
    const result = await authService.resetProducerCode(phone, newCode, 1);
    if (result.success) {
      setMessage('Code réinitialisé avec succès!');
    } else {
      setMessage(result.error || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-green-800">
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

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setShowInscriptionForm(!showInscriptionForm)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              {showInscriptionForm ? 'Fermer' : 'Inscrire un producteur'}
            </button>
          </div>

          {showInscriptionForm && (
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Inscription assistée</h2>
              <form onSubmit={handleInscription} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code (choisi par le producteur)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du producteur
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Langue préférée
                  </label>
                  <select
                    value={formData.langue}
                    onChange={(e) => setFormData({ ...formData, langue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="fr">Français</option>
                    <option value="fon">Fon</option>
                    <option value="bariba">Bariba</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de téléphone
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={formData.aSmartphone}
                        onChange={() => setFormData({ ...formData, aSmartphone: true })}
                        className="mr-2"
                      />
                      Smartphone
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!formData.aSmartphone}
                        onChange={() => setFormData({ ...formData, aSmartphone: false })}
                        className="mr-2"
                      />
                      Téléphone basique
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commune
                  </label>
                  <select
                    value={formData.commune}
                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    onFocus={loadCommunes}
                    required
                  >
                    <option value="">Sélectionner une commune</option>
                    {communesList.map((commune) => (
                      <option key={commune.id} value={commune.nom}>
                        {commune.nom} ({commune.departement})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Inscrire le producteur
                </button>
              </form>
            </div>
          )}

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${message.includes('succès') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Réinitialiser un code</h2>
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="Numéro de téléphone"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Nouveau code (6 chiffres)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              maxLength={6}
            />
            <button
              onClick={() => handleResetCode('', '')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
