'use client';

import { useEffect, useRef, useState } from 'react';
import StoryCard from '@/components/StoryCard';
import SelectorModal from '@/components/SelectorModal';
import BottomNav from '@/components/BottomNav';
import GenerationLoader from '@/components/GenerationLoader';
import { storyFields, StoryState, StoryField } from '@/lib/storyData';

type NavView = 'home' | 'stories' | 'audio';

interface StoryRecord {
  id: string;
  title: string;
  story_text: string;
  created_at?: string | null;
  status?: string | null;
  inputs?: StoryState;
  audio?: {
    audio_url?: string | null;
    status?: string | null;
    voice_id?: string | null;
  } | null;
}

export default function Home() {
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

    setGenerationState('generating_story');
    setError(null);
    setActiveStory(null);

    try {
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyState }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el cuento');
      }

      if (data.success && data.story?.story_text) {
        const newStory: StoryRecord = {
          id: data.story.id,
          title: data.story.title ?? '',
          story_text: data.story.story_text,
          created_at: data.story.created_at ?? null,
          status: data.story.status ?? null,
          inputs: data.story.inputs,
        };
        const storyLength = newStory.story_text.length;
        console.log(`Longitud del cuento: ${storyLength} caracteres`);
        setActiveStory(newStory);
        setStories((prev) => [newStory, ...prev.filter((story) => story.id !== newStory.id)]);
        setGenerationState('generating_audio');
        const audioResult = await triggerAudioGeneration(newStory.id);
        if (audioResult.ok) {
          setGenerationState('done');
        } else {
          setGenerationState('error');
          const lengthInfo = ` (Longitud: ${storyLength} caracteres)`;
          setError(
            `${audioResult.errorMessage || 'No se pudo generar el audio. Intentalo de nuevo.'}${lengthInfo}`
          );
        }
      } else {
        throw new Error('No se recibió el cuento generado');
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

  const triggerAudioGeneration = async (storyId: string) => {
    const trimmedVoiceId = storyState.narrator?.optionId?.trim() || '';
    applyAudioUpdate(storyId, {
      audio_url: null,
      status: 'pending',
      voice_id: trimmedVoiceId || null,
    });

    try {
      const payload: { story_id: string; voice_id?: string } = { story_id: storyId };
      if (trimmedVoiceId) {
        payload.voice_id = trimmedVoiceId;
      }

      const response = await fetch('/api/story/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data?.detail ? ` (${data.detail})` : '';
        const codeLabel = data?.code ? ` [${data.code}]` : '';
        throw new Error(
          `${data.error || 'Error al generar el audio'}${codeLabel}${detail}`
        );
      }

      applyAudioUpdate(storyId, {
        audio_url: data.audio?.audio_url ?? null,
        status: data.audio?.status ?? null,
        voice_id: data.audio?.voice_id ?? null,
      });
      return { ok: true } as const;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al generar el audio';
      console.error('Error al generar audio:', err);
      applyAudioUpdate(storyId, {
        audio_url: null,
        status: 'error',
        voice_id: trimmedVoiceId || null,
      });
      return { ok: false, errorMessage } as const;
    }
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

    setDeletingStories((prev) => ({ ...prev, [storyId]: true }));
    setStoriesError(null);

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
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

    setDeletingAudios((prev) => ({ ...prev, [storyId]: true }));
    setStoriesError(null);

    try {
      const response = await fetch(`/api/story/audio/${storyId}`, {
        method: 'DELETE',
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
      const response = await fetch('/api/stories', { cache: 'no-store' });
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

  useEffect(() => {
    if (activeView === 'stories' || activeView === 'audio') {
      loadStories();
    }
  }, [activeView]);

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
    generationState === 'generating_story' || generationState === 'generating_audio';

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
                  return (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => setActiveStory(story)}
                      className="text-left bg-white rounded-2xl border border-pink-100 p-5 shadow-sm hover:shadow-md transition-shadow"
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
                        Leer cuento
                      </div>
                    </button>
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
                      Todavia no hay audios creados. Genera un cuento y activa el audio.
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
                                  <a
                                    href={story.audio.audio_url}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors"
                                  >
                                    Descargar audio
                                  </a>
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
      </main>

      <BottomNav
        active={activeView}
        onNavigate={setActiveView}
        onCreate={handleConfirm}
        createDisabled={!isFormComplete() || isBlocking}
      />

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
          phase={generationState === 'generating_story' ? 'story' : 'audio'}
        />
      )}

      {/* Modal para mostrar el cuento generado */}
      {(error ||
        (activeStory &&
          generationState !== 'generating_story' &&
          generationState !== 'generating_audio')) && (
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
                          <a
                            href={activeStory.audio.audio_url || undefined}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold shadow-sm hover:bg-pink-600 transition-colors"
                          >
                            Descargar audio
                          </a>
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











