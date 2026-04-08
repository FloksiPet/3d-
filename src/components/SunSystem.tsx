import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { Environment, Sky } from '@react-three/drei';

const GAME_SPEED = 48;

export function SunSystem() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const gameTime = useStore(s => s.gameTime);
  const sunOffset = useStore(s => s.sunOffset);
  const updateGameTime = useStore(s => s.updateGameTime);
  const setGameTime = useStore(s => s.setGameTime);

  // Initialize game time to current Kyiv time (UTC+3)
  useEffect(() => {
    const now = new Date();
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const kyivMinutes = (utcMinutes + 180) % 1440; // UTC+3
    setGameTime(kyivMinutes);
  }, [setGameTime]);

  useFrame((_, delta) => {
    // 1 real second = 48 game seconds
    // delta is in real seconds
    const gameSecondsElapsed = delta * GAME_SPEED;
    const gameMinutesElapsed = gameSecondsElapsed / 60;
    updateGameTime(gameMinutesElapsed);
  });

  const totalMinutes = (gameTime + sunOffset) % 1440;
  const hour = totalMinutes / 60;
  
  // Sun position calculation
  // 06:00 = East (X+), 12:00 = South (Z-), 18:00 = West (X-), 00:00 = North (Z+)
  // Angle in radians: 0 at 12:00 (South), PI/2 at 18:00 (West), PI at 00:00 (North), 3PI/2 at 06:00 (East)
  const angle = ((totalMinutes - 720) / 720) * Math.PI;
  
  // Elevation: Max at noon, min at midnight
  // We'll use a simple sine wave for elevation
  const elevation = Math.sin((totalMinutes - 360) / 720 * Math.PI) * 0.8; // Max ~45 degrees
  
  const sunX = -Math.sin(angle) * 100;
  const sunZ = -Math.cos(angle) * 100;
  const sunY = Math.max(elevation * 100, -10); // Don't go too far below ground

  const isDay = elevation > 0;
  const intensity = isDay ? Math.min(elevation * 3, 1.5) : 0.05;
  const sunColor = isDay ? new THREE.Color('#fff5e6').lerp(new THREE.Color('#ffffff'), elevation) : new THREE.Color('#1a1a2e');

  const targetRef = useRef<THREE.Object3D>(null);

  return (
    <>
      <Sky 
        sunPosition={[sunX, sunY, sunZ]} 
        turbidity={0.1}
        rayleigh={0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      
      <object3D ref={targetRef} position={[0, 0, 0]} />
      
      <directionalLight
        ref={sunRef}
        castShadow={isDay}
        position={[sunX, sunY, sunZ]}
        target={targetRef.current || undefined}
        intensity={intensity}
        color={sunColor}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.1}
        shadow-camera-far={300}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Hemisphere light simulates global illumination / bounced light from sky and ground */}
      <hemisphereLight 
        color={isDay ? "#ffffff" : "#222244"} 
        groundColor={isDay ? "#8B7355" : "#111111"} 
        intensity={isDay ? 0.3 : 0.05} 
      />
    </>
  );
}

export function TimeUI() {
  const gameTime = useStore(s => s.gameTime);
  const sunOffset = useStore(s => s.sunOffset);
  const setSunOffset = useStore(s => s.setSunOffset);
  
  const totalMinutes = (gameTime + sunOffset) % 1440;
  const hour = Math.floor(totalMinutes / 60);
  const minute = Math.floor(totalMinutes % 60);
  
  return (
    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-4 py-3 rounded-lg text-white font-mono border border-white/10 z-50 pointer-events-auto flex flex-col gap-2">
      <div className="text-xl">
        {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
      </div>
      <div className="text-[10px] text-gray-400 uppercase tracking-widest">Kyiv Time (x48)</div>
      <div className="mt-2">
        <label className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Time Offset (Test)</label>
        <input 
          type="range" 
          min="0" 
          max="1440" 
          value={sunOffset} 
          onChange={(e) => setSunOffset(parseInt(e.target.value))}
          className="w-32 accent-white"
        />
      </div>
    </div>
  );
}
