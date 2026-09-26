'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone } from 'lucide-react';

interface Contact {
  contact_id: number;
  statut_contact: string;
  message: string | null;
  quantite_proposee: number | null;
  contact_created_at: string;
  annonce_id: number;
  produit: string;
  prix: number;
  unite: string;
  producteur_id: number;
  producteur_nom: string;
  producteur_telephone: string;
}

export default function AcheteurContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<number | null>(null);
  const [montants, setMontants] = useState<Record<number, string>>({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('agri_current_user') || '{}');
    if (!user?.id) { router.push('/'); return; }
    fetch(`/api/acheteur/contacts?acheteur_id=${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setContacts(d.data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleValider(contact: Contact) {
    const montant = Number(montants[contact.contact_id]);
    if (!montant) return;
    setValidating(contact.contact_id);
    const res = await fetch('/api/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contact.contact_id, montant }),
    });
    if (res.ok) {
      setContacts(prev => prev.map(c =>
        c.contact_id === contact.contact_id ? { ...c, statut_contact: 'accepte' } : c
      ));
    }
    setValidating(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <h1 className="text-xl font-bold text-purple-800 flex-1">Producteurs contactés</h1>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">Chargement…</p>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2" aria-hidden="true">📞</p>
              <p>Aucun producteur ne vous a encore contacté.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {contacts.map(c => (
                <li key={c.contact_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-semibold text-gray-800">{c.producteur_nom}</div>
                      <div className="text-xs text-gray-500">
                        Pour : {c.produit} · {c.prix.toLocaleString('fr-FR')} FCFA/{c.unite}
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.statut_contact === 'accepte' ? 'bg-green-100 text-green-700' :
                      c.statut_contact === 'refuse' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {c.statut_contact === 'en_discussion' ? 'En discussion' :
                       c.statut_contact === 'accepte' ? 'Accepté' : 'Refusé'}
                    </span>
                  </div>
                  {c.message && (
                    <p className="text-sm text-gray-600 mb-2 italic">&ldquo;{c.message}&rdquo;</p>
                  )}
                  {c.quantite_proposee && (
                    <p className="text-sm text-gray-700">
                      Quantité proposée : <strong>{c.quantite_proposee} {c.unite}</strong>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`tel:${c.producteur_telephone}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="w-4 h-4" aria-hidden="true" /> {c.producteur_telephone}
                    </a>
                  </div>
                  {c.statut_contact === 'en_discussion' && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <label htmlFor={`montant-${c.contact_id}`} className="text-sm text-gray-700 shrink-0">
                        Montant total (FCFA) :
                      </label>
                      <input
                        id={`montant-${c.contact_id}`}
                        type="number"
                        min="1"
                        value={montants[c.contact_id] || ''}
                        onChange={e => setMontants(prev => ({ ...prev, [c.contact_id]: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-32 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        placeholder="ex: 45000"
                      />
                      <button
                        onClick={() => handleValider(c)}
                        disabled={!montants[c.contact_id] || validating === c.contact_id}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        {validating === c.contact_id ? 'Validation…' : 'Valider la commande'}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
