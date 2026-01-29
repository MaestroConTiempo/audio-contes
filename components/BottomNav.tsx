type NavView = 'home' | 'stories' | 'audio';

interface BottomNavProps {
  active: NavView;
  onNavigate: (next: NavView) => void;
  onCreate: () => void;
  createDisabled?: boolean;
}

export default function BottomNav({
  active,
  onNavigate,
  onCreate,
  createDisabled,
}: BottomNavProps) {
  const baseButton =
    'flex flex-col items-center justify-center px-3 py-2 sm:px-4 sm:py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm transition-colors';
  const homeClass =
    active === 'home' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-700';
  const storiesClass =
    active === 'stories' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-700';
  const audioClass =
    active === 'audio' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-700';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-transparent z-40 pb-safe">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 max-w-screen-xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`${baseButton} ${homeClass}`}
          aria-pressed={active === 'home'}
        >
          <span className="text-2xl">{'\u{1F3E0}'}</span>
          <span className="text-xs mt-1">Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stories')}
          className={`${baseButton} ${storiesClass}`}
          aria-pressed={active === 'stories'}
        >
          <span className="text-2xl">{'\u{1F4DA}'}</span>
          <span className="text-xs mt-1">Cuentos</span>
        </button>

        <button
          type="button"
          onClick={onCreate}
          disabled={createDisabled}
          className="px-6 py-3 sm:px-12 sm:py-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm sm:text-lg font-bold rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.03] active:translate-y-1 active:scale-[0.96] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
          aria-label="Crear la historia"
        >
          Crear la historia
        </button>

        <button
          type="button"
          onClick={() => onNavigate('audio')}
          className={`${baseButton} ${audioClass}`}
          aria-pressed={active === 'audio'}
        >
          <span className="text-2xl">{'\u{1F3B5}'}</span>
          <span className="text-xs mt-1">Audio</span>
        </button>

      </div>
    </nav>
  );
}
