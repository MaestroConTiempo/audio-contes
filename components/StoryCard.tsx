import { StorySelection } from '@/lib/storyData';

interface StoryCardProps {
  title: string;
  selection: StorySelection;
  onClick: () => void;
}

export default function StoryCard({ title, selection, onClick }: StoryCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="bg-slate-300 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>

      <div className="p-6 flex flex-col items-center justify-center min-h-[160px]">
        {selection.optionId ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full flex items-center justify-center text-3xl mb-3">
              {selection.icon || '✨'}
            </div>
            <p className="text-slate-800 font-medium text-center">
              {selection.optionName}
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
              ❓
            </div>
            <p className="text-slate-400 text-center">Elija una opción...</p>
          </>
        )}
      </div>
    </div>
  );
}
