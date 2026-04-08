import { useStore, PlayerRole } from '../store';

export function RoleToggleUI() {
  const role = useStore(s => s.playerRole);
  const setRole = useStore(s => s.setPlayerRole);

  return (
    <div className="absolute top-4 left-4 pointer-events-auto z-50 flex gap-2 bg-black/50 p-2 rounded-full backdrop-blur-md">
      <button 
        onClick={() => setRole('owner')}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${role === 'owner' ? 'bg-yellow-600 ring-2 ring-white' : 'hover:bg-white/20'}`}
        title="Власник"
      >
        👑
      </button>
      <button 
        onClick={() => setRole('trusted')}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${role === 'trusted' ? 'bg-blue-600 ring-2 ring-white' : 'hover:bg-white/20'}`}
        title="Довірена особа"
      >
        👸
      </button>
      <button 
        onClick={() => setRole('guest')}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition ${role === 'guest' ? 'bg-gray-600 ring-2 ring-white' : 'hover:bg-white/20'}`}
        title="Гість"
      >
        👤
      </button>
    </div>
  );
}
