'use client';

import { useEffect, useMemo, useState } from 'react';
import { audioMessages, storyMessages } from '@/lib/generationMessages';

type GenerationPhase = 'story' | 'audio';

interface GenerationLoaderProps {
  phase: GenerationPhase;
  onCancel?: () => void;
  isCancelling?: boolean;
}

const pickRandom = (messages: string[], current?: string) => {
  if (messages.length === 0) return '';
  if (messages.length === 1) return messages[0];
  let next = current || messages[0];
  while (next === current) {
    next = messages[Math.floor(Math.random() * messages.length)];
  }
  return next;
};

export default function GenerationLoader({
  phase,
  onCancel,
  isCancelling = false,
}: GenerationLoaderProps) {
  const messages = useMemo(
    () => (phase === 'story' ? storyMessages : audioMessages),
    [phase]
  );
  const [message, setMessage] = useState<string>(() => pickRandom(messages));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessage((prev) => pickRandom(messages, prev));
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [messages]);

  const messageClassName =
    phase === 'story'
      ? 'text-[clamp(1.8rem,4.2vw,3.25rem)] font-semibold text-pink-600 leading-[1.1] min-h-[4.5rem] md:min-h-[5.5rem] handwriting'
      : 'text-lg md:text-xl font-semibold text-slate-700 leading-relaxed min-h-[3.5rem] handwriting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl px-6 py-8 text-center md:text-left"
        role="status"
        aria-live="polite"
      >
        <div className="md:flex md:items-center md:gap-8">
          <div className="mx-auto mb-4 md:mb-0 md:mx-0 h-14 w-14 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin shrink-0" />
          <div className="flex-1">
            <p className={messageClassName}>
              {message}
            </p>
            <p className="mt-3 text-xs text-slate-500 handwriting">
              Puedes cerrar la app y volver luego.
            </p>
            <button
              type="button"
              onClick={onCancel}
              disabled={!onCancel || isCancelling}
              className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-red-600 text-sm font-semibold border border-red-200 shadow-sm hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar generación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
