'use client';

import { useEffect, useRef, useState } from 'react';
import StoryCard from '@/components/StoryCard';
import SelectorModal from '@/components/SelectorModal';
import BottomNav from '@/components/BottomNav';
import { storyFields, StoryState, StoryField } from '@/lib/storyData';

type NavView = 'home' | 'stories';

interface StoryRecord {
  id: string;
  title: string;
  story_text: string;
  created_at?: string | null;
  status?: string | null;
  inputs?: StoryState;
}

export default function Home() {
  const [storyState, setStoryState] = useState<StoryState>({});
  const [activeField, setActiveField] = useState<StoryField | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStory, setActiveStory] = useState<StoryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<NavView>('home');
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const isFetchingStoriesRef = useRef(false);

  const handleCardClick = (fieldId: string) => {
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
  };

  const isFormComplete = () => {
    return (
      storyState.hero?.optionId &&
      storyState.place?.optionId &&
      storyState.narrator?.optionId
    );
  };

  const handleConfirm = async () => {
    if (!isFormComplete()) {
      return;
    }

    setIsGenerating(true);
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
          title: data.story.title || 'Cuento infantil',
          story_text: data.story.story_text,
          created_at: data.story.created_at ?? null,
          status: data.story.status ?? null,
          inputs: data.story.inputs,
        };
        setActiveStory(newStory);
        setStories((prev) => [newStory, ...prev.filter((story) => story.id !== newStory.id)]);
      } else {
        throw new Error('No se recibió el cuento generado');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al generar cuento:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseStory = () => {
    setActiveStory(null);
    setError(null);
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
    if (activeView === 'stories') {
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

  const fieldOrder = ['hero', 'sidekick', 'object', 'place', 'moral', 'narrator'];

  return (
    <div className="min-h-screen bg-pink-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-pink-100">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-pink-600 handwriting">
            {activeView === 'home' ? 'Compón tu historia' : 'Mis cuentos'}
          </h1>
          {activeView === 'home' ? (
            <button
              onClick={handleReset}
              className="p-2 rounded-full hover:bg-pink-100 transition-colors"
              title="Reiniciar"
            >
              <span className="text-2xl">🔄</span>
            </button>
          ) : (
            <button
              onClick={loadStories}
              className="p-2 rounded-full hover:bg-pink-100 transition-colors"
              title="Actualizar"
            >
              <span className="text-2xl">🔁</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {activeView === 'home' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fieldOrder.map((fieldId) => {
              const field = storyFields[fieldId];
              return (
                <StoryCard
                  key={fieldId}
                  title={field.title}
                  selection={storyState[fieldId] || {}}
                  onClick={() => handleCardClick(fieldId)}
                />
              );
            })}
          </div>
        ) : (
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
                TodavÃ­a no hay cuentos guardados. Genera uno y aparecerÃ¡ aquÃ­.
              </div>
            ) : (
              <div className="grid gap-4">
                {stories.map((story) => {
                  const storyDate = formatStoryDate(story.created_at);
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
                            {story.title}
                          </h3>
                          {storyDate && (
                            <p className="text-xs text-slate-400 mt-1">{storyDate}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 uppercase tracking-wide">
                          {story.status || 'guardado'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-3 max-h-24 overflow-hidden">
                        {story.story_text}
                      </p>
                      <div className="mt-3 text-pink-600 text-sm font-semibold">
                        Leer cuento
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {activeView === 'home' && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30 md:bottom-24">
          <div className="max-w-screen-xl mx-auto">
            <button
              onClick={handleConfirm}
              disabled={!isFormComplete() || isGenerating}
              className="w-full md:w-auto md:min-w-[300px] md:mx-auto md:block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all disabled:hover:shadow-lg"
            >
              {isGenerating ? 'Generando... ⏳' : 'Confirmar ▶︎'}
            </button>
          </div>
        </div>
      )}

      <BottomNav active={activeView} onNavigate={setActiveView} />

      {activeField && (
        <SelectorModal
          field={activeField}
          currentSelection={storyState[activeField.id] || {}}
          onClose={() => setActiveField(null)}
          onConfirm={handleModalConfirm}
        />
      )}

      {/* Modal para mostrar el cuento generado */}
      {(activeStory || error) && (
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
