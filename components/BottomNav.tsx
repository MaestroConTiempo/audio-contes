export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40 pb-safe">
      <div className="flex items-center justify-around px-4 py-2 max-w-screen-xl mx-auto">
        <button className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors">
          <span className="text-2xl">🏠</span>
          <span className="text-xs mt-1">Inicio</span>
        </button>

        <button className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors">
          <span className="text-2xl">📚</span>
          <span className="text-xs mt-1">Cuentos</span>
        </button>

        <button className="flex flex-col items-center justify-center -mt-8 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-full w-16 h-16 shadow-xl hover:shadow-2xl transition-shadow">
          <span className="text-3xl">✨</span>
        </button>

        <button className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors">
          <span className="text-2xl">🎵</span>
          <span className="text-xs mt-1">Audio</span>
        </button>

        <button className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-700 transition-colors">
          <span className="text-2xl">⚙️</span>
          <span className="text-xs mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
}
