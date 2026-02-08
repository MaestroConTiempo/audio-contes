import Image from 'next/image';
import { StorySelection } from '@/lib/storyData';

interface StoryCardProps {
  title: string;
  selection: StorySelection;
  onClick: () => void;
  cardIcon?: string;
  prioritizeImage?: boolean;
}

export default function StoryCard({
  title,
  selection,
  onClick,
  cardIcon,
  prioritizeImage = false,
}: StoryCardProps) {
  const hasSelection = Boolean(selection.optionId || selection.freeText);

  return (
    <div
      onClick={onClick}
      className="bg-white/85 backdrop-blur-sm rounded-3xl shadow-md border border-white/70 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="bg-white/80 px-2.5 py-2 sm:px-4 sm:py-3 border-b border-white/60">
        <h3 className="text-[11px] sm:text-sm font-semibold text-slate-800">{title}</h3>
      </div>

      <div className="p-3 sm:p-6 flex flex-col items-center justify-center min-h-[96px] sm:min-h-[160px]">
        {hasSelection ? (
          <>
            <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-pink-200/90 to-purple-200/90 rounded-full flex items-center justify-center text-3xl sm:text-4xl mb-2 sm:mb-3 overflow-hidden shadow-sm">
              {selection.image ? (
                <Image
                  src={selection.image}
                  width={112}
                  height={112}
                  sizes="(max-width: 639px) 80px, 112px"
                  priority={prioritizeImage}
                  fetchPriority={prioritizeImage ? 'high' : 'auto'}
                  alt={selection.optionName || 'Selección'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{selection.icon || (selection.freeText ? '✍️' : '✨')}</span>
              )}
            </div>
            <p className="text-slate-800 text-[11px] sm:text-sm font-medium text-center">
              {selection.optionName || selection.freeText}
            </p>
            {selection.customName && (
              <p className="text-slate-600 text-[11px] sm:text-sm mt-1">
                {selection.customName}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/80 rounded-full flex items-center justify-center text-3xl sm:text-4xl mb-2 sm:mb-3 shadow-sm">
              <span>{cardIcon || '❔'}</span>
            </div>
            <p className="text-slate-400 text-center text-[11px] sm:text-sm">Elige una opción...</p>
          </>
        )}
      </div>
    </div>
  );
}
