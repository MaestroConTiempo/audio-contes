'use client';

import { useEffect, useMemo, useState } from 'react';
import { audioMessages, storyMessages } from '@/lib/generationMessages';

type GenerationPhase = 'story' | 'audio';

interface GenerationLoaderProps {
  phase: GenerationPhase;
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

export default function GenerationLoader({ phase }: GenerationLoaderProps) {
  const messages = useMemo(
    () => (phase === 'story' ? storyMessages : audioMessages),
    [phase]
  );
  const [message, setMessage] = useState<string>(() => pickRandom(messages));

  useEffect(() => {
    setMessage(pickRandom(messages));
    const intervalId = window.setInterval(() => {
      setMessage((prev) => pickRandom(messages, prev));
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full px-6 py-8 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto mb-4 h-14 w-14 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
        <h2 className="text-xl font-bold text-pink-600 mb-2">
          {phase === 'story' ? 'Creando el cuento' : 'Grabando el audio'}
        </h2>
        <p className="text-slate-600 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
