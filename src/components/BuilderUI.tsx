import { useState } from 'react';
import { useStore } from '../store';

export function BuilderUI() {
  const builderOpen = useStore(s => s.builderOpen);
  const setBuilderOpen = useStore(s => s.setBuilderOpen);
  
  // 0: empty, 1: floor/wall, 2: exterior door
  const [grid, setGrid] = useState<number[][]>(
    Array(10).fill(0).map(() => Array(10).fill(0))
  );

  if (!builderOpen) return null;

  const toggleCell = (x: number, y: number) => {
    const newGrid = [...grid.map(row => [...row])];
    newGrid[y][x] = (newGrid[y][x] + 1) % 3;
    setGrid(newGrid);
  };

  const handleBuild = () => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    const cells: {x: number, y: number, type: number}[] = [];

    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          cells.push({ x, y, type: cell });
        }
      });
    });

    if (cells.length === 0) {
        alert("Будь ласка, намалюйте хоча б один тайл підлоги (синій).");
        return;
    }

    const roomWidth = maxX - minX + 1;
    const roomDepth = maxY - minY + 1;

    // Відправляємо повідомлення, яке імітує 2D рушій
    window.postMessage({
      type: 'ENTER_INTERIOR',
      building: {
        cells,
        roomWidth,
        roomDepth,
        wallHeight: 2.7,
        minX,
        minY
      }
    }, '*');

    setBuilderOpen(false);
  };

  return (
    <div className="absolute inset-0 bg-black/90 pointer-events-auto flex items-center justify-center z-[100]">
      <div className="bg-gray-800 p-6 rounded-xl w-full max-w-2xl mx-4 flex flex-col items-center">
        <div className="flex justify-between items-center w-full mb-6">
          <h2 className="text-2xl font-bold text-white">Map Builder (Симуляція)</h2>
          <button onClick={() => setBuilderOpen(false)} className="text-gray-400 hover:text-white">Закрити</button>
        </div>
        
        <div className="grid grid-cols-10 gap-1 bg-gray-900 p-2 rounded-lg mb-6">
          {grid.map((row, y) => (
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`w-10 h-10 sm:w-12 sm:h-12 cursor-pointer border border-gray-700 flex items-center justify-center text-[10px] font-bold transition-colors text-center leading-tight
                  ${cell === 0 ? 'bg-gray-800 hover:bg-gray-600' : ''}
                  ${cell === 1 ? 'bg-blue-600 hover:bg-blue-500' : ''}
                  ${cell === 2 ? 'bg-amber-600 hover:bg-amber-500' : ''}
                `}
                onClick={() => toggleCell(x, y)}
              >
                {cell === 2 ? 'Двері' : ''}
              </div>
            ))
          ))}
        </div>

        <div className="flex gap-4 w-full justify-center">
          <button 
            onClick={handleBuild} 
            className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition"
          >
            Побудувати та Увійти
          </button>
          <button 
            onClick={() => {
              setGrid(Array(10).fill(0).map(() => Array(10).fill(0)));
            }} 
            className="px-6 py-3 bg-red-600/20 text-red-500 font-bold rounded-lg hover:bg-red-600/40 transition"
          >
            Очистити
          </button>
        </div>
        
        <p className="text-gray-400 mt-6 text-sm text-center">
          Малюйте замкнутий контур, щоб створити фундамент та зовнішні стіни.<br/>
          Внутрішні роботи (перегородки, двері) виконуються в 3D режимі будівництва.<br/>
          <span className="text-gray-500">Порожньо</span> → <span className="text-blue-400">Стіна</span> → <span className="text-amber-400">Вхідні Двері</span>
        </p>
      </div>
    </div>
  );
}
