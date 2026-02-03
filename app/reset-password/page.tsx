'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { translateSupabaseAuthError } from '@/lib/authErrorMessages';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, isLoading, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setPending(true);
    const response = await updatePassword(password);
    setPending(false);

    if (response.error) {
      setError(translateSupabaseAuthError(response.error.message));
      return;
    }

    setCompleted(true);
    setMessage('Contrasena actualizada. Ya puedes iniciar sesion.');
    await signOut();
    setTimeout(() => {
      router.replace('/');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[url('/Interfaz.png')] bg-cover bg-center p-4 md:p-8">
      <div className="max-w-xl mx-auto mt-10 rounded-3xl bg-white/80 backdrop-blur-md border border-white/70 shadow-xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-pink-600 handwriting text-center">
          Cambiar contrasena
        </h1>
        <p className="text-slate-600 mt-2 text-center">
          Crea una nueva contrasena para tu cuenta.
        </p>

        {isLoading ? (
          <p className="text-center text-slate-500 mt-6">Validando enlace...</p>
        ) : completed ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Contrasena actualizada. Redirigiendo al login...
          </div>
        ) : !user ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            El enlace no es valido o ha expirado. Solicita uno nuevo desde el login.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-600">
              Nueva contrasena
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white/90 px-3 py-2 text-slate-800 shadow-sm focus:border-pink-300 focus:outline-none"
                autoComplete="new-password"
                required
              />
            </label>

            <label className="block text-sm text-slate-600">
              Repetir contrasena
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
                className="mt-1 w-full rounded-xl border border-pink-100 bg-white/90 px-3 py-2 text-slate-800 shadow-sm focus:border-pink-300 focus:outline-none"
                autoComplete="new-password"
                required
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm font-medium text-pink-600 hover:text-pink-700 underline underline-offset-4"
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
