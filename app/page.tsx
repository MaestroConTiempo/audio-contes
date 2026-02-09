'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import StoryCard from '@/components/StoryCard';
import SelectorModal from '@/components/SelectorModal';
import BottomNav from '@/components/BottomNav';
import GenerationLoader from '@/components/GenerationLoader';
import { storyFields, StoryState, StoryField, StorySelection } from '@/lib/storyData';
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
  const startRequestControllerRef = useRef<AbortController | null>(null);
  const [activeGenerationStoryId, setActiveGenerationStoryId] = useState<string | null>(null);
  const [showGenerationStartModal, setShowGenerationStartModal] = useState(false);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [deletingStories, setDeletingStories] = useState<Record<string, boolean>>({});
  const [deletingAudios, setDeletingAudios] = useState<Record<string, boolean>>({});
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authRecoveryPending, setAuthRecoveryPending] = useState(false);
  const [activeStoryPanel, setActiveStoryPanel] = useState<'overview' | 'read' | 'listen'>(
    'overview'
  );

  const handleCardClick = (fieldId: string) => {
    if (generationState === 'generating_story' || generationState === 'generating_audio') {
      return;
    }
    setActiveField(storyFields[fieldId]);
  };

  const handleModalConfirm = (selection: StorySelection) => {
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
    setShowGenerationStartModal(false);
    setActiveGenerationStoryId(null);
  };

  const isFormComplete = () => {
    return Object.values(storyFields)
      .filter((field) => field.required)
      .every((field) => storyState[field.id]?.optionId);
  };

  const handleConfirm = () => {
    if (!isFormComplete()) {
      return;
    }

    if (!session) {
      setError('Debes iniciar sesión para crear cuentos.');
      setGenerationState('error');
      return;
    }

    setShowGenerationStartModal(true);
  };

  const handleStartGeneration = async () => {
    if (!isFormComplete()) {
      return;
    }

    if (!session) {
      setError('Debes iniciar sesión para crear cuentos.');
      setGenerationState('error');
      return;
    }

    setShowGenerationStartModal(false);
    setGenerationState('generating_story');
    setError(null);
    setStoriesError(null);
    setActiveStory(null);
    setActiveGenerationStoryId(null);

    const controller = new AbortController();
    startRequestControllerRef.current = controller;

    try {
      const response = await fetch('/api/story/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storyState }),
        signal: controller.signal,
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
        setActiveGenerationStoryId(newStory.id);
        setGenerationState('idle');
        setActiveView('home');
      } else {
        throw new Error('No se pudo iniciar la generación');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setGenerationState('idle');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      setGenerationState('error');
      console.error('Error al generar cuento:', err);
    } finally {
      if (startRequestControllerRef.current === controller) {
        startRequestControllerRef.current = null;
      }
    }
  };

  const getPendingStoryForCancellation = () => {
    if (activeGenerationStoryId) {
      const activePendingStory = stories.find((story) => {
        if (story.id !== activeGenerationStoryId) {
          return false;
        }
        const status = (story.status || '').trim();
        return PENDING_STORY_STATUSES.has(status) || story.audio?.status === 'pending';
      });
      if (activePendingStory) {
        return activePendingStory;
      }
    }

    return stories.find((story) => {
      const status = (story.status || '').trim();
      return PENDING_STORY_STATUSES.has(status) || story.audio?.status === 'pending';
    });
  };

  const handleCancelGeneration = async () => {
    startRequestControllerRef.current?.abort();
    startRequestControllerRef.current = null;

    if (!session) {
      setStoriesError('Debes iniciar sesión para cancelar la generación.');
      setGenerationState('idle');
      setShowGenerationStartModal(false);
      return;
    }

    const storyToCancel = getPendingStoryForCancellation();
    if (!storyToCancel) {
      setGenerationState('idle');
      setShowGenerationStartModal(false);
      setActiveGenerationStoryId(null);
      return;
    }

    setIsCancellingGeneration(true);
    setStoriesError(null);
    setError(null);

    try {
      const response = await fetch(`/api/stories/${storyToCancel.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar la generación');
      }

      setStories((prev) => prev.filter((story) => story.id !== storyToCancel.id));
      if (activeStory?.id === storyToCancel.id) {
        setActiveStory(null);
      }
      setActiveGenerationStoryId(null);
      setGenerationState('idle');
      setShowGenerationStartModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setStoriesError(errorMessage);
    } finally {
      setIsCancellingGeneration(false);
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
    setActiveStoryPanel('overview');
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
        setActiveStoryPanel('overview');
      }
      if (activeGenerationStoryId === storyId) {
        setActiveGenerationStoryId(null);
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
  const pendingGenerationStory = getPendingStoryForCancellation();
  const hasAnyPendingGeneration = hasPendingStoryGeneration || hasPendingAudioGeneration;

  useEffect(() => {
    if (!activeGenerationStoryId) {
      return;
    }

    const activeStoryStatus = stories.find((story) => story.id === activeGenerationStoryId);
    if (!activeStoryStatus) {
      setActiveGenerationStoryId(null);
      return;
    }

    const status = (activeStoryStatus.status || '').trim();
    const isStillPending =
      PENDING_STORY_STATUSES.has(status) || activeStoryStatus.audio?.status === 'pending';

    if (!isStillPending) {
      setActiveGenerationStoryId(null);
    }
  }, [stories, activeGenerationStoryId]);

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
    if (!session || !hasAnyPendingGeneration) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadStories();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [session?.access_token, hasAnyPendingGeneration]);

  useEffect(() => {
    if (!session) {
      startRequestControllerRef.current?.abort();
      startRequestControllerRef.current = null;
      setStories([]);
      setActiveStory(null);
      setGenerationState('idle');
      setShowGenerationStartModal(false);
      setActiveGenerationStoryId(null);
      setIsCancellingGeneration(false);
    }
  }, [session]);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    const email = authEmail.trim();
    const password = authPassword;
    const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    if (!email || !password) {
      setAuthError('Completa email y contraseña.');
      return;
    }

    setAuthPending(true);
    const response =
      authMode === 'signup'
        ? await signUp({ email, password, emailRedirectTo })
        : await signInWithPassword({ email, password });

    if (response.error) {
      setAuthError(translateSupabaseAuthError(response.error.message));
    } else if (authMode === 'signup' && !response.data.session) {
      setAuthMessage(
        'Te has registrado con éxito. Revisa tu correo para confirmar tu cuenta. Si no lo ves, revisa también correo no deseado o spam.'
      );
    } else {
      setAuthMessage('Sesión iniciada.');
    }
    setAuthPending(false);
  };

  const handleSignOut = async () => {
    setAuthError(null);
    setAuthMessage(null);
    startRequestControllerRef.current?.abort();
    startRequestControllerRef.current = null;
    await signOut();
    setStories([]);
    setActiveStory(null);
    setStoryState({});
    setGenerationState('idle');
    setShowGenerationStartModal(false);
    setActiveGenerationStoryId(null);
    setIsCancellingGeneration(false);
    setActiveView('home');
  };

  const handleForgotPassword = async () => {
    const email = authEmail.trim();
    setAuthError(null);
    setAuthMessage(null);

    if (!email) {
      setAuthError('Escribe tu email para recuperar la contraseña.');
      return;
    }

    setAuthRecoveryPending(true);
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const response = await resetPasswordForEmail(email, redirectTo);

    if (response.error) {
      setAuthError(translateSupabaseAuthError(response.error.message));
    } else {
      setAuthMessage('Te enviamos un enlace para restablecer tu contraseña.');
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

  const getStoryCoverImage = (story: StoryRecord) => {
    const imageFromInputs = story.inputs?.hero?.image?.trim();
    if (imageFromInputs) {
      return imageFromInputs;
    }

    const heroOptionId = story.inputs?.hero?.optionId?.trim();
    if (heroOptionId) {
      const heroOption = storyFields.hero.options.find((option) => option.id === heroOptionId);
      if (heroOption?.image) {
        return heroOption.image;
      }
    }

    return '/option-icons/misc/Inventado.webp';
  };

  const getStoryDurationLabel = (story?: StoryRecord | null) => {
    const text = story?.story_text?.trim();
    if (!text) {
      return 'Sin duracion';
    }

    const words = text.split(/\s+/).filter(Boolean).length;
    if (words === 0) {
      return 'Sin duracion';
    }

    const minutes = Math.max(1, Math.ceil(words / 130));
    return `${minutes} min aprox`;
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
  const activeStoryCover = activeStory ? getStoryCoverImage(activeStory) : null;
  const activeStoryDuration = getStoryDurationLabel(activeStory);
  const isBlocking =
    generationState === 'generating_story' ||
    generationState === 'generating_audio' ||
    hasAnyPendingGeneration;
  const loaderPhase: 'story' | 'audio' =
    hasPendingStoryGeneration || generationState === 'generating_story' ? 'story' : 'audio';

  return (
    <div className="min-h-screen bg-[url('/Interfaz.webp')] bg-cover bg-center pb-32">
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
                    prioritizeImage={fieldId === fieldOrder[0]}
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                {stories.map((story) => {
                  const status = (story.status || '').trim();
                  const isPendingStory = PENDING_STORY_STATUSES.has(status);
                  const canOpenStory = Boolean(story.story_text) && !isPendingStory;
                  const storyCover = getStoryCoverImage(story);
                  const storyDuration = getStoryDurationLabel(story);
                  const statusLabel =
                    status === 'error'
                      ? 'Error'
                      : status === 'ready'
                        ? 'Listo'
                        : isPendingStory
                          ? 'Generando'
                          : status || 'Generado';
                  return (
                    <div key={story.id} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (canOpenStory) {
                            setActiveStory(story);
                            setActiveStoryPanel('overview');
                          }
                        }}
                        disabled={!canOpenStory}
                        className={`group relative w-full aspect-square overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                          canOpenStory ? 'hover:shadow-md cursor-pointer' : 'cursor-default opacity-85'
                        }`}
                      >
                        <Image
                          src={storyCover}
                          alt={story.title || 'Cuento infantil'}
                          fill
                          sizes="(max-width: 640px) 46vw, (max-width: 768px) 30vw, (max-width: 1024px) 23vw, 18vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                        {statusLabel !== 'Listo' && (
                          <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                            {statusLabel}
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-2 text-left">
                          <p className="text-xs font-semibold text-white truncate">
                            {story.title || 'Cuento infantil'}
                          </p>
                          <p className="text-[11px] text-white/90">
                            {isPendingStory ? 'Generando...' : storyDuration}
                          </p>
                        </div>
                      </button>
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
                      Todavía no hay audios creados. Los nuevos cuentos generan audio automáticamente.
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

      {showGenerationStartModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-pink-100 p-6">
            <h2 className="text-xl font-bold text-pink-600 handwriting">
              Nuestra fábrica de cuentos puede tardar entre 3 y 7 minutos en crearlo. ¿Empezamos?
            </h2>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerationStartModal(false)}
                className="px-4 py-2 rounded-full bg-white text-slate-600 text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => void handleStartGeneration()}
                className="px-5 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {isBlocking && (
        <GenerationLoader
          key={loaderPhase}
          phase={loaderPhase}
          onCancel={
            pendingGenerationStory || generationState === 'generating_story'
              ? () => void handleCancelGeneration()
              : undefined
          }
          isCancelling={isCancellingGeneration}
        />
      )}

      {/* Modal para mostrar el cuento generado */}
      {(error || activeStory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-pink-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-pink-600">
                {error ? 'Error' : activeStory?.title || 'Tu cuento generado'}
              </h2>
              <button
                type="button"
                onClick={handleCloseStory}
                className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-full border border-pink-200 bg-white text-sm font-semibold text-pink-700 hover:bg-pink-50 transition-colors"
                title="Cerrar"
                aria-label="Cerrar cuento"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error ? (
                <div className="text-red-600">
                  <p className="font-semibold mb-2">No se pudo generar el cuento:</p>
                  <p>{error}</p>
                </div>
              ) : activeStory ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="relative aspect-square overflow-hidden rounded-2xl border border-pink-100 bg-pink-50">
                      <Image
                        src={activeStoryCover || '/option-icons/misc/Inventado.webp'}
                        alt={activeStory.title || 'Cuento infantil'}
                        fill
                        sizes="(max-width: 768px) 80vw, 220px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">
                          {activeStory.title || 'Cuento infantil'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Duracion: {activeStoryDuration}</p>
                        {formatStoryDate(activeStory.created_at) && (
                          <p className="text-xs text-slate-400 mt-1">
                            {formatStoryDate(activeStory.created_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveStoryPanel('read')}
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            activeStoryPanel === 'read'
                              ? 'bg-pink-500 text-white'
                              : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50'
                          }`}
                        >
                          Leer
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveStoryPanel('listen')}
                          className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                            activeStoryPanel === 'listen'
                              ? 'bg-pink-500 text-white'
                              : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50'
                          }`}
                        >
                          Escuchar
                        </button>
                      </div>
                    </div>
                  </div>
                  {activeStoryPanel === 'read' ? (
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4 max-h-[50vh] flex flex-col">
                      <p className="text-xs font-semibold uppercase tracking-wide text-pink-600 mb-2">Lectura</p>
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed overflow-y-auto pr-1">
                        {renderStoryText(activeStory.story_text)}
                      </div>
                    </div>
                  ) : activeStoryPanel === 'listen' ? (
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">Audio</p>
                      {activeStory.audio?.audio_url ? (
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
                                  void downloadAudio(activeStory.audio.audio_url, activeStory.title);
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
                      ) : activeStory.audio?.status === 'pending' ? (
                        <p className="text-sm text-slate-500">Generando audio...</p>
                      ) : activeStory.audio?.status === 'error' ? (
                        <p className="text-sm text-red-500">Error al generar el audio.</p>
                      ) : (
                        <p className="text-sm text-slate-500">Audio no disponible.</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/30 p-4 text-sm text-slate-600">
                      Elige si quieres leer o escuchar este cuento.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}















