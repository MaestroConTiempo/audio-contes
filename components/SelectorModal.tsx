'use client';

import { useState, useEffect } from 'react';
import { StoryField, StoryOption, StorySelection } from '@/lib/storyData';

interface SelectorModalProps {
  field: StoryField;
  currentSelection: StorySelection;
  onClose: () => void;
  onConfirm: (selection: StorySelection) => void;
}

export default function SelectorModal({
  field,
  currentSelection,
  onClose,
  onConfirm,
}: SelectorModalProps) {
  const [selectedOption, setSelectedOption] = useState<StoryOption | null>(null);
  const [customName, setCustomName] = useState('');

  useEffect(() => {
    if (currentSelection.optionId) {
      const option = field.options.find(opt => opt.id === currentSelection.optionId);
      if (option) setSelectedOption(option);
      if (currentSelection.customName) setCustomName(currentSelection.customName);
    }
  }, [currentSelection, field.options]);

  const handleConfirm = () => {
    if (!selectedOption) return;

    const selection: StorySelection = {
      optionId: selectedOption.id,
      optionName: selectedOption.name,
      icon: selectedOption.icon,
    };

    if (field.needsName && customName.trim()) {
      selection.customName = customName.trim();
    }

    onConfirm(selection);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col md:max-h-[80vh]">
        <div className="bg-gradient-to-r from-pink-300 to-purple-300 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{field.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {field.options.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedOption(option)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selectedOption?.id === option.id
                    ? 'border-pink-400 bg-pink-50 shadow-md scale-105'
                    : 'border-slate-200 hover:border-pink-300 hover:bg-pink-50'
                }`}
              >
                <div className="text-4xl mb-2">{option.icon}</div>
                <p className="text-sm font-medium text-slate-700 text-center">
                  {option.name}
                </p>
              </button>
            ))}
          </div>

          {field.needsName && selectedOption && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nombre de pila:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Escribe el nombre..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-2xl focus:border-pink-400 focus:outline-none text-slate-800"
              />
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-slate-300 rounded-2xl font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Anterior
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedOption}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
