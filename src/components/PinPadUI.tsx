import { useState } from 'react';
import { useStore } from '../store';

export function PinPadUI() {
  const pinPadOpen = useStore(s => s.pinPadOpen);
  const setPinPadOpen = useStore(s => s.setPinPadOpen);
  const doorConfigs = useStore(s => s.doorConfigs);
  const updateDoorConfig = useStore(s => s.updateDoorConfig);
  const toggleDoor = useStore(s => s.toggleDoor);
  const role = useStore(s => s.playerRole);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const hoveredType = useStore(s => s.hoveredType);

  if (!pinPadOpen) return null;
  const config = doorConfigs[pinPadOpen] || { pin: '', trustedNeedsPin: true };

  const handlePress = (num: string) => {
    if (pin.length < 5) {
      setPin(p => p + num);
      setError(false);
    }
  };

  const handleSubmit = () => {
    if (role === 'owner') {
       updateDoorConfig(pinPadOpen, { pin });
       setPinPadOpen(null);
       setPin('');
       return;
    }

    if (config.pin && config.pin === pin) {
      toggleDoor(pinPadOpen, true);
      setPinPadOpen(null);
      setPin('');
    } else {
      setError(true);
      setPin('');
    }
  };

  if (role === 'owner') {
    return (
      <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200] pointer-events-auto">
        <div className="bg-gray-800 p-6 rounded-xl w-72 flex flex-col items-center shadow-2xl border border-gray-700">
          <h2 className="text-white text-lg mb-4 font-bold">Lock Configuration</h2>
          <div className="w-full mb-4">
            <label className="text-gray-300 text-sm block mb-1">Set PIN Code (Max 5)</label>
            <div className="w-full h-12 bg-black rounded flex items-center justify-center text-2xl tracking-widest text-white">
              {pin.padEnd(5, '•')}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button key={n} onClick={() => handlePress(n.toString())} className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xl font-bold transition">{n}</button>
            ))}
            <button onClick={() => { setPin(''); setError(false); }} className="bg-red-900/50 hover:bg-red-800/50 text-red-200 py-2 rounded text-sm font-bold transition">CLR</button>
            <button onClick={() => handlePress('0')} className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-xl font-bold transition">0</button>
            <button onClick={handleSubmit} className="bg-green-700 hover:bg-green-600 text-white py-2 rounded text-sm font-bold transition">SAVE</button>
          </div>
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-gray-300 text-sm">Trusted needs PIN</span>
            <button 
              onClick={() => updateDoorConfig(pinPadOpen, { trustedNeedsPin: !config.trustedNeedsPin })}
              className={`px-3 py-1 rounded text-sm font-bold ${config.trustedNeedsPin ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
            >
              {config.trustedNeedsPin ? 'YES' : 'NO'}
            </button>
          </div>
          <button onClick={() => { setPinPadOpen(null); setPin(''); setError(false); }} className="text-gray-400 hover:text-white text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-[200] pointer-events-auto">
      <div className="bg-gray-800 p-6 rounded-xl w-64 flex flex-col items-center shadow-2xl border border-gray-700">
        <h2 className="text-white text-lg mb-4 font-bold">Enter PIN</h2>
        <div className={`w-full h-12 bg-black rounded mb-4 flex items-center justify-center text-2xl tracking-widest ${error ? 'text-red-500' : 'text-white'}`}>
          {pin.padEnd(5, '•').replace(/[0-9]/g, '*')}
        </div>
        <div className="grid grid-cols-3 gap-2 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handlePress(n.toString())} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded text-xl font-bold transition">
              {n}
            </button>
          ))}
          <button onClick={() => { setPin(''); setError(false); }} className="bg-red-900/50 hover:bg-red-800/50 text-red-200 py-3 rounded text-sm font-bold transition">
            CLR
          </button>
          <button onClick={() => handlePress('0')} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded text-xl font-bold transition">
            0
          </button>
          <button onClick={handleSubmit} className="bg-green-700 hover:bg-green-600 text-white py-3 rounded text-sm font-bold transition">
            OK
          </button>
        </div>
        <button onClick={() => { setPinPadOpen(null); setPin(''); setError(false); }} className="mt-4 text-gray-400 hover:text-white text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
