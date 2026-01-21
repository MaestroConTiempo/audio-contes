'use client';

import { useState } from 'react';
import StoryCard from '@/components/StoryCard';
import SelectorModal from '@/components/SelectorModal';
import BottomNav from '@/components/BottomNav';
import { storyFields, StoryState, StoryField } from '@/lib/storyData';

export default function Home() {
  const [storyState, setStoryState] = useState<StoryState>({});
  const [activeField, setActiveField] = useState<StoryField | null>(null);

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

  const handleConfirm = () => {
    if (isFormComplete()) {
      alert('¡Historia confirmada! (Funcionalidad pendiente)');
    }
  };

  const fieldOrder = ['hero', 'sidekick', 'object', 'place', 'moral', 'narrator'];

  return (
    <div className="min-h-screen bg-pink-50 pb-32">
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-pink-100">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-pink-600 handwriting">
            Compón tu historia
          </h1>
          <button
            onClick={handleReset}
            className="p-2 rounded-full hover:bg-pink-100 transition-colors"
            title="Reiniciar"
          >
            <span className="text-2xl">🔄</span>
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
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
      </main>

      <div className="fixed bottom-20 left-0 right-0 px-4 z-30 md:bottom-24">
        <div className="max-w-screen-xl mx-auto">
          <button
            onClick={handleConfirm}
            disabled={!isFormComplete()}
            className="w-full md:w-auto md:min-w-[300px] md:mx-auto md:block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-lg font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all disabled:hover:shadow-lg"
          >
            Confirmar ▶︎
          </button>
        </div>
      </div>

      <BottomNav />

      {activeField && (
        <SelectorModal
          field={activeField}
          currentSelection={storyState[activeField.id] || {}}
          onClose={() => setActiveField(null)}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}
