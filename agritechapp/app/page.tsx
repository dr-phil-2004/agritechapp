'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Normalise un numéro béninois : format 01XXXXXXXX (10 chiffres)
// Accepte aussi l'ancien format 8 chiffres en ajoutant le préfixe 01
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 8) return `01${digits}`;
  return digits;
}

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'phone', phone: normalizePhone(phone), code }),
      });
      const data = await response.json() as { success: boolean; user?: { role: string }; error?: string };
      if (data.success) {
        localStorage.setItem('agri_current_user', JSON.stringify(data.user));
        const role = data.user?.role;
        if (role === 'producteur') router.push('/producteur');
        else if (role === 'acheteur') router.push('/acheteur');
      } else {
        setError(data.error ?? 'Erreur de connexion');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    }
    setIsLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email, password }),
      });
      const data = await response.json() as { success: boolean; user?: { role: string }; error?: string };
      if (data.success) {
        localStorage.setItem('agri_current_user', JSON.stringify(data.user));
        const role = data.user?.role;
        if (role === 'conseiller') router.push('/conseiller');
        else if (role === 'admin') router.push('/admin');
      } else {
        setError(data.error ?? 'Erreur de connexion');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    }
    setIsLoading(false);
  };

  // Pavé numérique pour le code PIN à 6 chiffres
  const handleKeypadPress = (num: string) => {
    if (code.length < 6) setCode((prev) => prev + num);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-green-800 mb-1">AgriVeille</h1>
          <p className="text-center text-gray-500 text-sm mb-8">Veille phytosanitaire participative</p>

          {/* Onglets */}
          <div className="flex mb-6 bg-gray-100 rounded-xl p-1" role="tablist" aria-label="Mode de connexion">
            <button
              role="tab" aria-selected={loginType === 'phone'}
              onClick={() => setLoginType('phone')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${loginType === 'phone' ? 'bg-white text-green-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Téléphone
            </button>
            <button
              role="tab" aria-selected={loginType === 'email'}
              onClick={() => setLoginType('email')}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${loginType === 'email' ? 'bg-white text-green-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              E-mail (conseiller / admin)
            </button>
          </div>

          {/* ── Connexion par téléphone ───────────────────────────────── */}
          {loginType === 'phone' && (
            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro de téléphone
                </label>
                <p className="text-xs text-gray-400 mb-2">10 chiffres (ex : 01 97 00 00 00)</p>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01 XX XX XX XX"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="w-full px-4 py-4 text-2xl tracking-widest text-center border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                  aria-describedby="phone-hint"
                />
                <p id="phone-hint" className="sr-only">Entrez votre numéro à 8 chiffres sans l'indicatif pays</p>
              </div>

              <div>
                <label htmlFor="code-display" className="block text-sm font-medium text-gray-700 mb-2">
                  Code à 6 chiffres
                </label>
                {/* Affichage du code saisi */}
                <div
                  id="code-display"
                  className="w-full px-4 py-4 text-3xl tracking-[0.5em] text-center border-2 border-gray-200 rounded-xl bg-gray-50 font-mono mb-4 min-h-[64px]"
                  role="status"
                  aria-live="polite"
                  aria-label={`Code saisi : ${code.length} chiffre${code.length !== 1 ? 's' : ''} sur 6`}
                >
                  {'●'.repeat(code.length)}{'○'.repeat(Math.max(0, 6 - code.length))}
                </div>

                {/* Pavé numérique géant (§ 6 bis CLAUDE.md) */}
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6,7,8,9].map((num) => (
                    <button
                      key={num} type="button"
                      onClick={() => handleKeypadPress(String(num))}
                      className="h-16 text-3xl font-bold bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                      aria-label={`Chiffre ${num}`}
                    >
                      {num}
                    </button>
                  ))}
                  <div /> {/* vide */}
                  <button
                    type="button" onClick={() => handleKeypadPress('0')}
                    className="h-16 text-3xl font-bold bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                    aria-label="Chiffre 0"
                  >0</button>
                  <button
                    type="button" onClick={() => setCode((prev) => prev.slice(0, -1))}
                    className="h-16 text-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label="Supprimer le dernier chiffre"
                  >⌫</button>
                </div>
              </div>

              <button
                type="submit" disabled={isLoading || phone.replace(/\D/g,'').length < 10 || code.length < 6}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-300"
              >
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* ── Connexion par e-mail ──────────────────────────────────── */}
          {loginType === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email" id="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <input
                  type="password" id="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit" disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-green-300"
              >
                {isLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          )}

          {/* Erreur */}
          {error && (
            <div role="alert" className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">⚠️</span>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <a href="/demo" className="text-green-600 hover:text-green-700 font-medium text-sm">
              Page de démonstration →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
