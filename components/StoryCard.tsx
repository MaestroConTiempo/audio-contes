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
      className="bg-white rounded-3xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="bg-slate-300 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>

      <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
        {hasSelection ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center text-3xl mb-3 overflow-hidden">
              {selection.image ? (
                <img
                  src={selection.image}
                  alt={selection.optionName || 'Selección'}
                  className="w-10 h-10"
                />
              ) : (
                <span>{selection.icon || (selection.freeText ? '✍️' : '✨')}</span>
              )}
            </div>
            <p className="text-slate-800 font-medium text-center">
              {selection.optionName || selection.freeText}
            </p>
            {selection.customName && (
              <p className="text-slate-600 text-sm mt-1">
                {selection.customName}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-3">
              <span>{cardIcon || '❔'}</span>
            </div>
            <p className="text-slate-400 text-center">Elije una opción...</p>
          </>
        )}
      </div>
    </div>
  );
}
