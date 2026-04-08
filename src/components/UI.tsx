import { useStore } from '../store';
import { Package, Hand, Map, LogOut } from 'lucide-react';
import React, { useRef } from 'react';
import { BuilderUI } from './BuilderUI';
import { PinPadUI } from './PinPadUI';
import { RoleToggleUI } from './RoleToggleUI';
import { BuildMenuUI } from './BuildMenuUI';
import { Hammer } from 'lucide-react';

function MobileTouchArea() {
  const setLookDelta = useStore(s => s.setLookDelta);
  const setKey = useStore(s => s.setKey);
  const lastTouch = useRef<{x: number, y: number, time: number} | null>(null);

  return (
    <div 
      className="absolute top-0 right-0 w-1/2 h-full pointer-events-auto touch-none z-10"
      onTouchStart={(e) => {
        const touch = e.changedTouches[0];
        const now = Date.now();
        if (lastTouch.current && now - lastTouch.current.time < 300) {
          // Double tap
          setKey('jump', true);
          setTimeout(() => setKey('jump', false), 100);
        }
        lastTouch.current = { x: touch.clientX, y: touch.clientY, time: now };
      }}
      onTouchMove={(e) => {
        if (!lastTouch.current) return;
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - lastTouch.current.x;
        const deltaY = touch.clientY - lastTouch.current.y;
        setLookDelta({ x: deltaX, y: deltaY });
        lastTouch.current = { x: touch.clientX, y: touch.clientY, time: lastTouch.current.time };
      }}
      onTouchEnd={() => {
        // Keep time for double tap, but reset position tracking if needed
      }}
      onTouchCancel={() => {
        lastTouch.current = null;
      }}
    />
  );
}

function Joystick() {
  const setJoystick = useStore(s => s.setJoystick);
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const activeTouch = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTouch.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouch.current = touch.identifier;
    updateStick(touch);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch.current) {
        updateStick(e.changedTouches[i]);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouch.current) {
        activeTouch.current = null;
        if (stickRef.current) {
          stickRef.current.style.transform = `translate(0px, 0px)`;
        }
        setJoystick({ x: 0, y: 0 });
        break;
      }
    }
  };

  const updateStick = (touch: React.Touch) => {
    if (!baseRef.current || !stickRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxDist = rect.width / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    stickRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    setJoystick({ x: dx / maxDist, y: -dy / maxDist }); // Invert Y for forward/backward
  };

  return (
    <div 
      ref={baseRef}
      className="w-32 h-32 bg-white/10 border border-white/20 rounded-full flex items-center justify-center touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div ref={stickRef} className="w-12 h-12 bg-white/40 rounded-full shadow-lg" />
    </div>
  );
}

export function UI() {
  const hoveredId = useStore(s => s.hoveredId);
  const hoveredType = useStore(s => s.hoveredType);
  const heldItem = useStore(s => s.heldItem);
  const inventoryOpen = useStore(s => s.inventoryOpen);
  const builderOpen = useStore(s => s.builderOpen);
  const buildMode = useStore(s => s.buildMode);
  const toggleInventory = useStore(s => s.toggleInventory);
  const setBuilderOpen = useStore(s => s.setBuilderOpen);
  const setBuildMode = useStore(s => s.setBuildMode);
  const inventory = useStore(s => s.inventory);
  const equipItem = useStore(s => s.equipItem);
  const setKey = useStore(s => s.setKey);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inventoryOpen || builderOpen) return;
      switch (e.code) {
        case 'KeyW': setKey('forward', true); break;
        case 'KeyS': setKey('backward', true); break;
        case 'KeyA': setKey('left', true); break;
        case 'KeyD': setKey('right', true); break;
        case 'KeyE': setKey('interact', true); break;
        case 'Space': setKey('jump', true); break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': setKey('forward', false); break;
        case 'KeyS': setKey('backward', false); break;
        case 'KeyA': setKey('left', false); break;
        case 'KeyD': setKey('right', false); break;
        case 'KeyE': setKey('interact', false); break;
        case 'Space': setKey('jump', false); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [inventoryOpen, builderOpen, setKey]);

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const [isLocked, setIsLocked] = React.useState(false);

  React.useEffect(() => {
    const handleLock = () => setIsLocked(true);
    const handleUnlock = () => setIsLocked(false);
    document.addEventListener('pointerlockchange', handleLock);
    document.addEventListener('mozpointerlockchange', handleLock);
    document.addEventListener('webkitpointerlockchange', handleLock);
    // We can't easily detect unlock without specific events
    return () => {
      document.removeEventListener('pointerlockchange', handleLock);
      document.removeEventListener('mozpointerlockchange', handleLock);
      document.removeEventListener('webkitpointerlockchange', handleLock);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Click to Start Overlay for Desktop */}
      {!isTouch && !isLocked && !inventoryOpen && !builderOpen && (
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto flex items-center justify-center z-[1000] cursor-pointer"
          onClick={() => {
            const canvas = document.querySelector('canvas');
            if (canvas) {
              canvas.requestPointerLock();
            }
          }}
        >
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Click to Start</h1>
            <p className="text-gray-300">Use WASD to move, Mouse to look</p>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 bg-white/80 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
      </div>

      {/* Interaction Prompt */}
      {hoveredId && !heldItem && hoveredId !== 'nail' && hoveredType !== 'door' && hoveredType !== 'exit_door' && hoveredType !== 'interior_door' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-8 text-white bg-black/50 px-4 py-2 rounded-md font-bold">
          Press E to Pick Up
        </div>
      )}
      {hoveredId === 'nail' && heldItem?.type === 'painting' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-8 text-white bg-black/50 px-4 py-2 rounded-md font-bold">
          Press E to Hang
        </div>
      )}
      {hoveredType === 'door' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-8 text-white bg-black/50 px-4 py-2 rounded-md font-bold">
          Press E to Exit
        </div>
      )}
      {(hoveredType === 'exit_door' || hoveredType === 'interior_door') && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 mt-8 text-white bg-black/50 px-4 py-2 rounded-md font-bold">
          Press E to Interact
        </div>
      )}

      {/* Inventory Button */}
      <div className="absolute top-4 right-4 pointer-events-auto z-50 flex gap-4">
        <button onClick={() => {
          useStore.getState().resetDefaultDoors();
          window.parent.postMessage({ type: 'EXIT_INTERIOR' }, '*');
        }} className="bg-red-900/50 p-3 rounded-full backdrop-blur-md text-white hover:bg-red-900/80 transition" title="Exit Building">
          <LogOut size={24} />
        </button>
        <button onClick={() => setBuildMode(!buildMode)} className={`p-3 rounded-full backdrop-blur-md transition ${buildMode ? 'bg-green-600 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`} title="3D Build Mode">
          <Hammer size={24} />
        </button>
        <button onClick={() => setBuilderOpen(true)} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/40 transition" title="Map Builder">
          <Map size={24} />
        </button>
        <button onClick={toggleInventory} className="bg-white/20 p-3 rounded-full backdrop-blur-md text-white hover:bg-white/40 transition" title="Inventory">
          <Package size={24} />
        </button>
      </div>

      {/* Builder Modal */}
      <BuilderUI />
      <PinPadUI />
      <RoleToggleUI />
      <BuildMenuUI />

      {/* Inventory Modal */}
      {inventoryOpen && (
        <div className="absolute inset-0 bg-black/80 pointer-events-auto flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Inventory</h2>
              <button onClick={toggleInventory} className="text-gray-400 hover:text-white">Close</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {inventory.map(item => (
                <button 
                  key={item.id}
                  onClick={() => equipItem(item)}
                  className="aspect-square bg-gray-700 rounded-lg flex flex-col items-center justify-center hover:bg-gray-600 transition border border-gray-600 hover:border-white"
                >
                  <div className="w-12 h-12 bg-gray-500 rounded-md mb-2 flex items-center justify-center text-xs text-white/50">
                    {item.type}
                  </div>
                  <span className="text-xs text-white text-center px-1 truncate w-full">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {isTouch && !inventoryOpen && !builderOpen && (
        <div className="absolute inset-0 pointer-events-none">
          <MobileTouchArea />
          
          <div className="absolute bottom-8 right-8 flex gap-4 pointer-events-auto z-50">
            <button 
              className="w-16 h-16 bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center text-white active:bg-white/40"
              onTouchStart={() => setKey('interact', true)}
              onTouchEnd={() => setKey('interact', false)}
            >
              <Hand size={28} />
            </button>
          </div>

          <div className="absolute bottom-8 left-8 pointer-events-auto z-50">
            <Joystick />
          </div>
        </div>
      )}
    </div>
  );
}
