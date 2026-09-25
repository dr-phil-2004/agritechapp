'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/domains/auth/auth-service';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authService = new AuthService();

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authService.loginWithPhoneCode(phone, code);

    if (result.success) {
      // Rediriger selon le rôle
      const role = result.user?.role;
      if (role === 'producteur') {
        router.push('/(producteur)');
      } else if (role === 'acheteur') {
        router.push('/(acheteur)');
      }
    } else {
      setError(result.error || 'Erreur de connexion');
    }

    setIsLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await authService.loginWithEmailPassword(email, password);

    if (result.success) {
      const role = result.user?.role;
      if (role === 'conseiller') {
        router.push('/conseiller');
      } else if (role === 'admin') {
        router.push('/admin');
      }
    } else {
      setError(result.error || 'Erreur de connexion');
    }

    setIsLoading(false);
  };

  const playNumberSound = (num: string) => {
    // TODO: Implémenter la lecture audio des chiffres
    console.log('Playing sound for:', num);
  };

  const handleKeypadPress = (num: string) => {
    playNumberSound(num);
    if (code.length < 6) {
      setCode(code + num);
    }
  };

  const handleDelete = () => {
    setCode(code.slice(0, -1));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-center text-green-800 mb-2">
            AgriVeille
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Veille phytosanitaire participative
          </p>

          {/* Toggle entre phone et email */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLoginType('phone')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                loginType === 'phone'
                  ? 'bg-white text-green-700 shadow'
                  : 'text-gray-600'
              }`}
            >
              Téléphone
            </button>
            <button
              onClick={() => setLoginType('email')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                loginType === 'email'
                  ? 'bg-white text-green-700 shadow'
                  : 'text-gray-600'
              }`}
            >
              E-mail
            </button>
          </div>

          {loginType === 'phone' ? (
            <form onSubmit={handlePhoneLogin} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+229 XX XX XX XX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Code à 6 chiffres
                </label>
                <input
                  type="text"
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              {/* Pavé numérique géant */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num.toString())}
                    className="h-16 text-3xl font-bold bg-green-100 hover:bg-green-200 rounded-lg transition-colors active:bg-green-300"
                    aria-label={`Chiffre ${num}`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-16 text-3xl font-bold bg-green-100 hover:bg-green-200 rounded-lg transition-colors active:bg-green-300"
                  aria-label="Chiffre 0"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-16 text-2xl bg-red-100 hover:bg-red-200 rounded-lg transition-colors active:bg-red-300"
                  aria-label="Supprimer"
                >
                  ⌫
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                aria-label="Écouter les instructions"
              >
                <span className="text-2xl">🔊</span>
                <span>Écouter</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">⚠️</span>
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <a
              href="/demo"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Page de démo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
