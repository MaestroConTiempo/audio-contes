import { StorySelection } from '@/lib/storyData';

interface StoryCardProps {
  title: string;
  selection: StorySelection;
  onClick: () => void;
  cardIcon?: string;
}

export default function StoryCard({
  title,
  selection,
  onClick,
  cardIcon,
}: StoryCardProps) {
  const hasSelection = Boolean(selection.optionId || selection.freeText);

  return (
    <div
      onClick={onClick}
      className="bg-white/85 backdrop-blur-sm rounded-3xl shadow-md border border-white/70 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="bg-white/80 px-3 py-2 sm:px-4 sm:py-3 border-b border-white/60">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-800">{title}</h3>
      </div>

      <div className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[120px] sm:min-h-[160px]">
        {hasSelection ? (
          <>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-200/90 to-purple-200/90 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-2 sm:mb-3 overflow-hidden shadow-sm">
              {selection.image ? (
                <img
                  src={selection.image}
                  alt={selection.optionName || 'Selección'}
                  className="w-8 h-8 sm:w-10 sm:h-10"
                />
              ) : (
                <span>{selection.icon || (selection.freeText ? '✍️' : '✨')}</span>
              )}
            </div>
            <p className="text-slate-800 text-xs sm:text-sm font-medium text-center">
              {selection.optionName || selection.freeText}
            </p>
            {selection.customName && (
              <p className="text-slate-600 text-xs sm:text-sm mt-1">
                {selection.customName}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/80 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-2 sm:mb-3 shadow-sm">
              <span>{cardIcon || '❔'}</span>
            </div>
            <p className="text-slate-400 text-center text-xs sm:text-sm">Elije una opción...</p>
          </>
        )}
      </div>
    </div>
  );
}
