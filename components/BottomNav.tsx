type NavView = 'home' | 'stories';

interface BottomNavProps {
  active: NavView;
  onNavigate: (next: NavView) => void;
}

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  const homeClass =
    active === 'home' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-700';
  const storiesClass =
    active === 'stories' ? 'text-pink-600' : 'text-slate-400 hover:text-slate-700';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40 pb-safe">
      <div className="flex items-center justify-around px-4 py-2 max-w-screen-xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${homeClass}`}
          aria-pressed={active === 'home'}
        >
          <span className="text-2xl">{'\u{1F3E0}'}</span>
          <span className="text-xs mt-1">Inicio</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('stories')}
          className={`flex flex-col items-center justify-center p-2 transition-colors ${storiesClass}`}
          aria-pressed={active === 'stories'}
        >
          <span className="text-2xl">{'\u{1F4DA}'}</span>
          <span className="text-xs mt-1">Cuentos</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center -mt-8 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full w-16 h-16 shadow-xl hover:shadow-2xl transition-shadow"
          aria-label="Crear cuento"
        >
          <span className="text-3xl">{'\u2728'}</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <span className="text-2xl">{'\u{1F3B5}'}</span>
          <span className="text-xs mt-1">Audio</span>
        </button>

        <button
          type="button"
          className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <span className="text-2xl">{'\u2699\uFE0F'}</span>
          <span className="text-xs mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
}
