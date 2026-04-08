import { useStore } from '../store';
import { RotateCcw, RotateCw, X, Store } from 'lucide-react';

export function BuildMenuUI() {
  const buildMode = useStore(s => s.buildMode);
  const buildTool = useStore(s => s.buildTool);
  const setBuildTool = useStore(s => s.setBuildTool);
  const materials = useStore(s => s.materials);
  const buildMenuOpen = useStore(s => s.buildMenuOpen);
  const setBuildMenuOpen = useStore(s => s.setBuildMenuOpen);
  const setGhostRotation = useStore(s => s.setGhostRotation);

  if (!buildMode) return null;

  const tools = [
    { id: 'vector_wall_wood', name: 'Дерев. Стіна', cost: 10, mat: 'wood', color: 'bg-yellow-800' },
    { id: 'vector_wall_brick', name: 'Цегляна Стіна', cost: 15, mat: 'brick', color: 'bg-red-800' },
    { id: 'window_glass', name: 'Вікно', cost: 20, mat: 'glass', color: 'bg-blue-400' },
    { id: 'wall_light_metal', name: 'Настінна Лампа', cost: 10, mat: 'metal', color: 'bg-gray-600' },
    { id: 'ceiling_light_metal', name: 'Стельова Лампа', cost: 12, mat: 'metal', color: 'bg-yellow-600' },
    { id: 'door_wood', name: 'Двері', cost: 15, mat: 'wood', color: 'bg-amber-700' },
    { id: 'locked_door_wood', name: 'Двері з Замком', cost: 20, mat: 'wood', color: 'bg-red-900' },
    { id: 'doorway_wood', name: 'Проєм', cost: 5, mat: 'wood', color: 'bg-green-800' },
  ];

  if (!buildMenuOpen && buildTool) {
    const activeTool = tools.find(t => t.id === buildTool);
    const isVector = buildTool.startsWith('vector_wall');
    return (
      <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 p-3 rounded-full border border-gray-700 z-50 flex gap-2 pointer-events-auto shadow-2xl items-center">
        <button
          onClick={() => setBuildMenuOpen(true)}
          className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition"
          title="Відкрити магазин"
        >
          <Store size={20} />
        </button>
        
        <div className={`px-4 py-2 rounded-full text-sm font-bold text-white flex items-center gap-2 ${activeTool?.color}`}>
          {activeTool?.name}
        </div>

        <div className="w-px h-8 bg-gray-600 mx-1" />

        {!isVector && (
          <>
            <button
              onClick={() => setGhostRotation(prev => prev - Math.PI / 4)}
              className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition"
              title="Повернути вліво"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => setGhostRotation(prev => prev + Math.PI / 4)}
              className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white hover:bg-gray-600 transition"
              title="Повернути вправо"
            >
              <RotateCw size={20} />
            </button>
          </>
        )}
        <button
          onClick={() => { setBuildTool(null); setBuildMenuOpen(true); }}
          className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-500 transition"
          title="Скасувати"
        >
          <X size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 p-4 rounded-xl border border-gray-700 z-50 flex flex-col gap-4 pointer-events-auto shadow-2xl w-[90vw] max-w-lg">
      <div className="flex justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-wider">
        <span>Режим Будівництва (Внутрішні роботи)</span>
        <div className="flex gap-3">
          <span className="text-yellow-500">Дерево: {materials.wood}</span>
          <span className="text-red-400">Цегла: {materials.brick}</span>
          <span className="text-blue-300">Скло: {materials.glass}</span>
          <span className="text-gray-400">Метал: {materials.metal}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {tools.map(t => {
          const canAfford = materials[t.mat] >= t.cost;
          const matName = t.mat === 'wood' ? 'Дерева' : t.mat === 'brick' ? 'Цегли' : t.mat === 'glass' ? 'Скла' : 'Металу';
          return (
            <button
              key={t.id}
              onClick={() => {
                if (canAfford) {
                  setBuildTool(t.id);
                  setBuildMenuOpen(false);
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition flex flex-col items-center gap-1
                ${buildTool === t.id ? 'ring-2 ring-white scale-105' : 'opacity-80 hover:opacity-100'}
                ${canAfford ? t.color : 'bg-gray-700 cursor-not-allowed'} text-white`}
            >
              <span>{t.name}</span>
              <span className={`text-xs ${canAfford ? 'opacity-70' : 'text-red-400'}`}>
                {t.cost} {matName} {t.id.startsWith('vector') ? '/ м' : ''}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => setBuildTool(null)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition bg-gray-700 text-white hover:bg-gray-600 ${!buildTool ? 'ring-2 ring-white' : ''}`}
        >
          Скасувати
        </button>
      </div>
      <div className="text-center text-xs text-gray-500">
        Натисніть <span className="text-white font-bold">R</span> щоб повернути. Натисніть <span className="text-white font-bold">ЛКМ</span> щоб побудувати.
      </div>
    </div>
  );
}
