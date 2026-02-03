'use client';

import { useEffect, useRef, useState } from 'react';
import StoryCard from '@/components/StoryCard';
import SelectorModal from '@/components/SelectorModal';
import BottomNav from '@/components/BottomNav';
import GenerationLoader from '@/components/GenerationLoader';
import { storyFields, StoryState, StoryField } from '@/lib/storyData';
import { useAuth } from '@/components/AuthProvider';
import { translateSupabaseAuthError } from '@/lib/authErrorMessages';

type NavView = 'home' | 'stories' | 'audio';

interface StoryRecord {
  id: string;
  title: string;
  story_text?: string | null;
  created_at?: string | null;
  status?: string | null;
  generation_error?: string | null;
  generated_at?: string | null;
  inputs?: StoryState;
  audio?: {
    audio_url?: string | null;
    status?: string | null;
    voice_id?: string | null;
  } | null;
}

const PENDING_STORY_STATUSES = new Set(['pending', 'generating_story', 'generating_audio']);

export default function Home() {
  const {
    user,
    session,
    isLoading: isAuthLoading,
    signUp,
    signInWithPassword,
    resetPasswordForEmail,
    signOut,
  } = useAuth();
  const buildAudioFilename = (title?: string | null) => {
    const raw = (title || 'cuento').trim() || 'cuento';
    const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    return `${safe || 'cuento'}.mp3`;
  };

  const downloadAudio = async (url: string, title?: string | null) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('download_failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = buildAudioFilename(title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank');
    }
  };
  const [storyState, setStoryState] = useState<StoryState>({});
  const [activeField, setActiveField] = useState<StoryField | null>(null);
  const [generationState, setGenerationState] = useState<
    'idle' | 'generating_story' | 'generating_audio' | 'done' | 'error'
  >('idle');
  const [activeStory, setActiveStory] = useState<StoryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<NavView>('home');
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const isFetchingStoriesRef = useRef(false);
  const [deletingStories, setDeletingStories] = useState<Record<string, boolean>>({});
  const [deletingAudios, setDeletingAudios] = useState<Record<string, boolean>>({});
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authRecoveryPending, setAuthRecoveryPending] = useState(false);

  const handleCardClick = (fieldId: string) => {
    if (generationState === 'generating_story' || generationState === 'generating_audio') {
      return;
    }
    setActiveField(storyFields[fieldId]);
  };

  const handleModalConfirm = (selection: any) => {
    if (activeField) {
      setStoryState({
        ...storyState,
        [activeField.id]: selection,
      });
    }
    setActiveField(null);
  };

  const handleReset = () => {
    setStoryState({});
    setGenerationState('idle');
  };

  const isFormComplete = () => {
    return Object.values(storyFields)
      .filter((field) => field.required)
      .every((field) => storyState[field.id]?.optionId);
  };

  const handleConfirm = async () => {
    if (!isFormComplete()) {
      return;
    }

    if (!session) {
      setError('Debes iniciar sesiÃ³n para crear cuentos.');
      setGenerationState('error');
      return;
    }

    setGenerationState('generating_story');
    setError(null);
    setActiveStory(null);

    try {
      const response = await fetch('/api/story/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storyState }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el cuento');
      }

      if (data.success && data.story_id) {
        const newStory: StoryRecord = {
          id: data.story_id,
          title: data.story?.title ?? '',
          story_text: null,
          created_at: data.story?.created_at ?? null,
          status: data.status ?? data.story?.status ?? 'pending',
          inputs: storyState,
          audio: {
            audio_url: null,
            status: 'pending',
            voice_id: storyState.narrator?.optionId?.trim() || null,
          },
        };
        setStories((prev) => [newStory, ...prev.filter((story) => story.id !== newStory.id)]);
        setGenerationState('idle');
        setActiveView('stories');
      } else {
        throw new Error('No se pudo iniciar la generación');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setGenerationState('error');
      console.error('Error al generar cuento:', err);
    }
  };

  const applyAudioUpdate = (
    storyId: string,
    audio: StoryRecord['audio']
  ) => {
    setStories((prev) =>
      prev.map((story) => (story.id === storyId ? { ...story, audio } : story))
    );
    setActiveStory((prev) =>
      prev?.id === storyId ? { ...prev, audio } : prev
    );
  };

  const handleCloseStory = () => {
    setActiveStory(null);
    setError(null);
    if (generationState === 'error' || generationState === 'done') {
      setGenerationState('idle');
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este cuento?')) {
      return;
    }

    if (!session) {
      setStoriesError('Debes iniciar sesión para eliminar cuentos.');
      return;
    }

    setDeletingStories((prev) => ({ ...prev, [storyId]: true }));
    setStoriesError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el cuento');
      }

      setStories((prev) => prev.filter((story) => story.id !== storyId));
      if (activeStory?.id === storyId) {
        setActiveStory(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setStoriesError(errorMessage);
    } finally {
      setDeletingStories((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  const handleDeleteAudio = async (storyId: string) => {
    if (!confirm('¿Seguro que quieres eliminar este audio?')) {
      return;
    }

    if (!session) {
      setStoriesError('Debes iniciar sesión para eliminar audios.');
      return;
    }

    setDeletingAudios((prev) => ({ ...prev, [storyId]: true }));
    setStoriesError(null);

    try {
      const response = await fetch(`/api/story/audio/${storyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el audio');
      }

      applyAudioUpdate(storyId, null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setStoriesError(errorMessage);
    } finally {
      setDeletingAudios((prev) => ({ ...prev, [storyId]: false }));
    }
  };

  const loadStories = async () => {
    if (isFetchingStoriesRef.current) {
      return;
    }
    isFetchingStoriesRef.current = true;
    setIsLoadingStories(true);
    setStoriesError(null);

    try {
      if (!session) {
        setStories([]);
        setStoriesError('Inicia sesión para ver tus cuentos.');
        return;
      }

      const response = await fetch('/api/stories', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar los cuentos');
      }

      setStories(data.stories || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setStoriesError(errorMessage);
    } finally {
      setIsLoadingStories(false);
      isFetchingStoriesRef.current = false;
    }
  };

  const hasPendingStoryGeneration = stories.some((story) =>
    PENDING_STORY_STATUSES.has((story.status || '').trim())
  );
  const hasPendingAudioGeneration = stories.some((story) => story.audio?.status === 'pending');

  useEffect(() => {
    if (!isAuthLoading) {
      void loadStories();
    }
  }, [session?.access_token, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading && (activeView === 'stories' || activeView === 'audio')) {
      void loadStories();
    }
  }, [activeView, session?.access_token, isAuthLoading]);

  useEffect(() => {
    if (!session || (!hasPendingStoryGeneration && !hasPendingAudioGeneration)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadStories();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [session?.access_token, hasPendingStoryGeneration, hasPendingAudioGeneration]);

  useEffect(() => {
    if (!session) {
      setStories([]);
      setActiveStory(null);
      setGenerationState('idle');
    }
  }, [session]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    const email = authEmail.trim();
    const password = authPassword;

    if (!email || !password) {
      setAuthError('Completa email y contraseña.');
      return;
    }

    setAuthPending(true);
    const response =
      authMode === 'signup'
        ? await signUp({ email, password })
        : await signInWithPassword({ email, password });

    if (response.error) {
      setAuthError(translateSupabaseAuthError(response.error.message));
    } else if (authMode === 'signup' && !response.data.session) {
      setAuthMessage('Registro exitoso. Revisa tu correo para confirmar tu cuenta.');
    } else {
      setAuthMessage('Sesión iniciada.');
    }
    setAuthPending(false);
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    await signOut();
    setStories([]);
    setActiveStory(null);
    setStoryState({});
    setGenerationState('idle');
    setActiveView('home');
  };

  const handleForgotPassword = async () => {
    const email = authEmail.trim();
    setAuthError(null);
    setAuthMessage(null);

    if (!email) {
      setAuthError('Escribe tu email para recuperar la contrasena.');
      return;
    }

    setAuthRecoveryPending(true);
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const response = await resetPasswordForEmail(email, redirectTo);

    if (response.error) {
      setAuthError(translateSupabaseAuthError(response.error.message));
    } else {
      setAuthMessage('Te enviamos un enlace para restablecer tu contrasena.');
    }
    setAuthRecoveryPending(false);
  };

  const formatStoryDate = (value?: string | null) => {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderStoryText = (value?: string | null) => {
    if (!value) {
      return null;
    }

    let key = 0;
    const lines = value.split('\n');

    const renderInline = (text: string) => {
      const nodes: React.ReactNode[] = [];
      let cursor = 0;

      while (cursor < text.length) {
        const start = text.indexOf('**', cursor);
        if (start === -1) {
          nodes.push(text.slice(cursor));
          break;
        }

        const end = text.indexOf('**', start + 2);
        if (end === -1) {
          nodes.push(text.slice(cursor));
          break;
        }

        if (start > cursor) {
          nodes.push(text.slice(cursor, start));
        }

        const boldText = text.slice(start + 2, end);
        nodes.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {boldText}
          </strong>
        );
        cursor = end + 2;
      }

      return nodes;
    };

    return lines.map((line, index) => (
      <span key={`line-${key++}`}>
        {renderInline(line)}
        {index < lines.length - 1 ? <br /> : null}
      </span>
    ));
  };

  const fieldOrder = ['hero', 'sidekick', 'object', 'place', 'moral', 'language', 'narrator'];
  const isBlocking =
    generationState === 'generating_story' ||
    generationState === 'generating_audio' ||
    hasPendingStoryGeneration ||
    hasPendingAudioGeneration;

  return (
    <div className="min-h-screen bg-[url('/Interfaz.png')] bg-cover bg-center pb-32">
            <header className="bg-transparent sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm">
            <h1 className="text-2xl md:text-3xl font-bold text-pink-600 handwriting">
              {activeView === 'home'
                ? 'Crea tu historia única'
                : activeView === 'audio'
                  ? 'Mis audios'
                  : 'Mis cuentos'}
            </h1>
          </div>
          {activeView === 'home' ? (
            <button
              onClick={handleReset}
              className="p-2 rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-sm hover:bg-white/80 transition-colors"
              title="Reiniciar"
            >
              <span className="text-2xl">🔄</span>
            </button>
          ) : (
            <button
              onClick={loadStories}
              className="p-2 rounded-full bg-white/70 backdrop-blur-md border border-white/60 shadow-sm hover:bg-white/80 transition-colors"
              title="Actualizar"
            >
              <span className="text-2xl">🔁</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 pb-40">
        {isAuthLoading ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-white/70 shadow-sm px-6 py-4 text-slate-500">
              Cargando sesión...
            </div>
          </div>
        ) : !user ? (
          <div className="min-h-[70vh] flex items-center justify-center">
            <div className="w-full max-w-xl rounded-3xl bg-white/70 backdrop-blur-md border border-white/70 shadow-xl p-6 md:p-8">
              <div className="mb-6 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-pink-600 handwriting">
                  Bienvenido a tu fábrica de cuentos
                </h2>
                <p className="text-slate-600 mt-2">
                  Inicia sesión o crea una cuenta para comenzar.
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      authMode === 'login'
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'bg-white/80 text-pink-600 border border-pink-200'
                    }`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      authMode === 'signup'
                        ? 'bg-pink-500 text-white shadow-sm'
                        : 'bg-white/80 text-pink-600 border border-pink-200'
                    }`}
                  >
                    Registrarme
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    Email
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="tu@email.com"
                      className="mt-1 w-full rounded-xl border border-pink-100 bg-white/90 px-3 py-2 text-slate-800 shadow-sm focus:border-pink-300 focus:outline-none"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label className="text-sm text-slate-600">
                    Contraseña
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder="********"
                      className="mt-1 w-full rounded-xl border border-pink-100 bg-white/90 px-3 py-2 text-slate-800 shadow-sm focus:border-pink-300 focus:outline-none"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      required
                    />
                  </label>
                </div>

                {authError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {authError}
                  </div>
                )}
                {authMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                    {authMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authPending || authRecoveryPending}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {authPending
                    ? authMode === 'signup'
                      ? 'Registrando...'
                      : 'Entrando...'
                    : authMode === 'signup'
                      ? 'Crear cuenta'
                      : 'Entrar'}
                </button>

                {authMode === 'login' && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={authPending || authRecoveryPending}
                      className="text-sm font-medium text-pink-600 hover:text-pink-700 underline underline-offset-4 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {authRecoveryPending
                        ? 'Enviando enlace...'
                        : '¿Has olvidado la contraseña?'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/70 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Sesión activa</p>
                  <p className="text-base font-semibold text-slate-800">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/90 text-pink-600 text-sm font-semibold border border-pink-200 shadow-sm hover:bg-white transition-colors"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

            {(hasPendingStoryGeneration || hasPendingAudioGeneration) && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {hasPendingStoryGeneration
                  ? 'Generando cuento... Puedes cerrar la app y volver luego.'
                  : 'Generando audio... Puedes cerrar la app y volver luego.'}
              </div>
            )}

            {activeView === 'home' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white/40 backdrop-blur-md p-6 md:p-8 shadow-inner border border-white/70">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {fieldOrder.map((fieldId) => {
                const field = storyFields[fieldId];
                return (
                  <StoryCard
                    key={fieldId}
                    title={field.title}
                    selection={storyState[fieldId] || {}}
                    cardIcon={field.cardIcon}
                    onClick={() => handleCardClick(fieldId)}
                  />
                );
              })}
              </div>
            </div>
          </div>
            ) : activeView === 'stories' ? (
          <div className="space-y-4">
            {storiesError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                {storiesError}
              </div>
            )}

            {isLoadingStories ? (
              <p className="text-slate-500">Cargando cuentos...</p>
            ) : stories.length === 0 ? (
              <div className="bg-white border border-pink-100 rounded-2xl p-6 text-slate-600">
                Aún no has creado ningún cuento. Crea uno y aparecerá aquí.
              </div>
            ) : (
              <div className="grid gap-4">
                {stories.map((story) => {
                  const storyDate = formatStoryDate(story.created_at);
                  const isDeleting = Boolean(deletingStories[story.id]);
                  const status = (story.status || '').trim();
                  const isPendingStory = PENDING_STORY_STATUSES.has(status);
                  const canOpenStory = Boolean(story.story_text) && !isPendingStory;
                  const statusLabel =
                    status === 'error'
                      ? 'Error'
                      : status === 'ready'
                        ? 'Listo'
                        : isPendingStory
                          ? 'Generando'
                          : status || 'Generado';
                  return (
                    <div
                      key={story.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (canOpenStory) {
                          setActiveStory(story);
                        }
                      }}
                      onKeyDown={(event) => {
                        if ((event.key === 'Enter' || event.key === ' ') && canOpenStory) {
                          event.preventDefault();
                          setActiveStory(story);
                        }
                      }}
                      className={`text-left bg-white rounded-2xl border border-pink-100 p-5 shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${canOpenStory ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">
                            {story.title || 'Cuento infantil'}
                          </h3>
                          {storyDate && (
                            <p className="text-xs text-slate-400 mt-1">{storyDate}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 uppercase tracking-wide">{statusLabel}</span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteStory(story.id);
                            }}
                            disabled={isDeleting}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 text-pink-600 text-sm font-semibold">
                        {isPendingStory
                          ? 'Generando cuento...'
                          : status === 'error'
                            ? 'Error al generar. Intentalo de nuevo.'
                            : 'Leer cuento'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            ) : (
          <div className="space-y-4">
            {storiesError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
                {storiesError}
              </div>
            )}

            {isLoadingStories ? (
              <p className="text-slate-500">Cargando audios...</p>
            ) : (
              (() => {
                const audioStories = stories.filter(
                  (story) =>
                    story.audio &&
                    (story.audio.audio_url ||
                      story.audio.status === 'pending' ||
                      story.audio.status === 'error')
                );

                if (audioStories.length === 0) {
                  return (
                    <div className="bg-white border border-pink-100 rounded-2xl p-6 text-slate-600">
                      Todavia no hay audios creados. Los nuevos cuentos generan audio automaticamente.
                    </div>
                  );
                }

                return (
                  <div className="grid gap-4">
                    {audioStories.map((story) => {
                      const storyDate = formatStoryDate(story.created_at);
                      return (
                        <div
                          key={story.id}
                          className="bg-white rounded-2xl border border-pink-100 p-5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">
                                {story.title || 'Cuento infantil'}
                              </h3>
                              {storyDate && (
                                <p className="text-xs text-slate-400 mt-1">{storyDate}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 uppercase tracking-wide">
                                {story.audio?.status || 'audio'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteAudio(story.id)}
                                disabled={Boolean(deletingAudios[story.id])}
                                className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {deletingAudios[story.id] ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          </div>
                          <div className="mt-4">
                            {story.audio?.audio_url ? (
                              <div className="space-y-3">
                                <audio
                                  controls
                                  src={story.audio.audio_url || undefined}
                                  className="w-full"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (story.audio?.audio_url) {
                                        void downloadAudio(
                                          story.audio.audio_url,
                                          story.title
                                        );
                                      }
                                    }}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors"
                                  >
                                    Descargar audio
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!story.audio?.audio_url) return;
                                      if (typeof navigator !== 'undefined' && 'share' in navigator) {
                                        try {
                                          await navigator.share({
                                            title: story.title || 'Mi cuento',
                                            url: story.audio.audio_url,
                                          });
                                        } catch {
                                          // Ignore cancel/share errors
                                        }
                                      } else {
                                        window.open(story.audio.audio_url, '_blank');
                                      }
                                    }}
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/80 text-pink-600 text-sm font-semibold border border-pink-200 shadow-sm hover:bg-white transition-colors"
                                  >
                                    Compartir
                                  </button>
                                </div>
                              </div>
                            ) : story.audio?.status === 'pending' ? (
                              <p className="text-sm text-slate-500">Generando audio...</p>
                            ) : story.audio?.status === 'error' ? (
                              <p className="text-sm text-red-500">Error al generar el audio.</p>
                            ) : (
                              <p className="text-sm text-slate-500">Audio no disponible.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
            )}
          </>
        )}
      </main>

      {user && (
        <BottomNav
          active={activeView}
          onNavigate={setActiveView}
          onCreate={handleConfirm}
          createDisabled={!isFormComplete() || isBlocking || !session}
        />
      )}

      {activeField && (
        <SelectorModal
          field={activeField}
          currentSelection={storyState[activeField.id] || {}}
          onClose={() => setActiveField(null)}
          onConfirm={handleModalConfirm}
        />
      )}

      {isBlocking && (
        <GenerationLoader
          phase={hasPendingStoryGeneration || generationState === 'generating_story' ? 'story' : 'audio'}
        />
      )}

      {/* Modal para mostrar el cuento generado */}
      {(error || activeStory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-pink-600">
                {error ? '❌ Error' : activeStory?.title || '✨ Tu cuento generado'}
              </h2>
              <button
                onClick={handleCloseStory}
                className="p-2 rounded-full hover:bg-pink-100 transition-colors"
                title="Cerrar"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>
            <div className="p-6">
              {error ? (
                <div className="text-red-600">
                  <p className="font-semibold mb-2">No se pudo generar el cuento:</p>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {renderStoryText(activeStory?.story_text)}
                  </div>
                  <div className="mt-6">
                    {activeStory?.audio?.audio_url ? (
                      <div className="space-y-3">
                        <audio
                          controls
                          src={activeStory.audio.audio_url || undefined}
                          className="w-full"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeStory.audio?.audio_url) {
                                void downloadAudio(
                                  activeStory.audio.audio_url,
                                  activeStory.title
                                );
                              }
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors"
                          >
                            Descargar audio
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const audioUrl = activeStory.audio?.audio_url;
                              if (!audioUrl) return;
                              if (typeof navigator !== 'undefined' && 'share' in navigator) {
                                try {
                                  await navigator.share({
                                    title: activeStory.title || 'Mi cuento',
                                    url: audioUrl,
                                  });
                                } catch {
                                  // Ignore cancel/share errors
                                }
                              } else {
                                window.open(audioUrl, '_blank');
                              }
                            }}
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/80 text-pink-600 text-sm font-semibold border border-pink-200 shadow-sm hover:bg-white transition-colors"
                          >
                            Compartir
                          </button>
                        </div>
                      </div>
                    ) : activeStory?.audio?.status === 'pending' ? (
                      <p className="text-sm text-slate-500">Generando audio...</p>
                    ) : activeStory?.audio?.status === 'error' ? (
                      <p className="text-sm text-red-500">Error al generar el audio.</p>
                    ) : (
                      <p className="text-sm text-slate-500">Audio no disponible.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}













