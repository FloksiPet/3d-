import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Sky, Environment, Html } from '@react-three/drei';
import { Player } from './components/Player';
import { Room } from './components/Room';
import { BuildSystem } from './components/BuildSystem';
import { UI } from './components/UI';
import { Table } from './components/Table';
import { Nail } from './components/Nail';
import { SceneItem } from './components/SceneItem';
import { SunSystem, TimeUI } from './components/SunSystem';
import { useStore } from './store';

export default function App() {
  const sceneItems = useStore(s => s.sceneItems);

  return (
    <div className="w-full h-screen bg-black select-none">
      <Canvas shadows camera={{ fov: 75 }}>
        <color attach="background" args={['#111']} />
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center justify-center text-white min-w-[200px]">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-xl font-medium">Loading Scene...</p>
            </div>
          </Html>
        }>
          <SunSystem />
          
          <Physics>
            <Player />
            <Room />
            <BuildSystem />
            <Table />
            <Nail />
            
            {sceneItems.map(item => (
              <SceneItem key={item.id} {...item} />
            ))}
          </Physics>
        </Suspense>
      </Canvas>
      <UI />
      <TimeUI />
    </div>
  );
}
