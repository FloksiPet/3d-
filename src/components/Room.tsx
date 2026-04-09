import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { CompiledWall } from './CompiledWall';
import { MeshPortalMaterial } from '@react-three/drei';
import { Landscape } from './Landscape';
import { DEFAULT, TILE, T, DOOR_W, DOOR_H, SHOW_GRID } from '../constants';
import type { BuildingLayout, Cell } from '../constants';

function SolidWall({ pos, size, rotation = [0, 0, 0], color = "#c8b89a", userData }: { key?: React.Key; pos: [number, number, number]; size: [number, number, number]; rotation?: [number, number, number]; color?: string; userData?: any }) {
  return (
    <RigidBody type="fixed" position={pos} rotation={rotation} userData={userData}>
      <mesh castShadow receiveShadow userData={userData}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </RigidBody>
  );
}

function InteractiveDoor({ id, axis, pos, rotation = 0, slideDir, isExit, isLocked, wallColor = "#c8b89a", isDoorway = false, wallHeight = 3 }: { id: string, axis: 'x'|'z', pos: [number,number,number], rotation?: number, slideDir: number, isExit: boolean, isLocked?: boolean, wallColor?: string, isDoorway?: boolean, wallHeight?: number }) {
  const isOpen = useStore(s => s.doorStates[id]);
  const rbRef = useRef<any>(null);
  
  const isSliding = slideDir !== 0;
  // Frame is 0.1 wide. We center it on the wall edge, so 0.05 is in the opening.
  const FRAME_W = 0.1;
  const ACTUAL_DOOR_W = DOOR_W - FRAME_W;
  
  const pivotOffset = axis === 'x' ? [ -ACTUAL_DOOR_W/2, 0, 0 ] : [ 0, 0, -ACTUAL_DOOR_W/2 ];
  const meshOffset = axis === 'x' ? [ ACTUAL_DOOR_W/2, 0, 0 ] : [ 0, 0, ACTUAL_DOOR_W/2 ];
  const pivotPos: [number,number,number] = [pivotOffset[0], 0, pivotOffset[2]];

  const FRAME_T = T * 1.2;
  const topH = wallHeight - DOOR_H;

  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!rbRef.current || isDoorway || !groupRef.current) return;
    
    if (isSliding) {
      const targetOffset = isOpen ? ACTUAL_DOOR_W * 0.8 * slideDir : 0;
      const localTarget = new THREE.Vector3(
        axis === 'x' ? targetOffset : 0,
        0,
        axis === 'z' ? targetOffset : 0
      );
      
      const worldTarget = localTarget.applyMatrix4(groupRef.current.matrixWorld);
      const currentPos = rbRef.current.translation();
      
      rbRef.current.setNextKinematicTranslation({
        x: THREE.MathUtils.lerp(currentPos.x, worldTarget.x, delta * 5),
        y: worldTarget.y,
        z: THREE.MathUtils.lerp(currentPos.z, worldTarget.z, delta * 5)
      });
    } else {
      const targetAngle = isOpen ? (Math.PI / 2) : 0;
      
      const parentQuat = new THREE.Quaternion();
      groupRef.current.getWorldQuaternion(parentQuat);
      
      const localQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
      const targetWorldQuat = parentQuat.multiply(localQuat);
      
      const currentRot = rbRef.current.rotation();
      const currentQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
      
      currentQuat.slerp(targetWorldQuat, delta * 5);
      rbRef.current.setNextKinematicRotation(currentQuat);
    }
  });

  return (
    <group ref={groupRef} position={pos} rotation={[0, rotation, 0]}>
      {/* Frame */}
      <RigidBody type="fixed">
        {/* Left Frame - Centered on edge */}
        <mesh position={axis === 'x' ? [-DOOR_W/2, -0.05, 0] : [0, -0.05, -DOOR_W/2]} castShadow receiveShadow>
          <boxGeometry args={axis === 'x' ? [FRAME_W, DOOR_H + 0.1, FRAME_T] : [FRAME_T, DOOR_H + 0.1, FRAME_W]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        {/* Right Frame - Centered on edge */}
        <mesh position={axis === 'x' ? [DOOR_W/2, -0.05, 0] : [0, -0.05, DOOR_W/2]} castShadow receiveShadow>
          <boxGeometry args={axis === 'x' ? [FRAME_W, DOOR_H + 0.1, FRAME_T] : [FRAME_T, DOOR_H + 0.1, FRAME_W]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
        {/* Top Frame */}
        <mesh position={axis === 'x' ? [0, DOOR_H/2, 0] : [0, DOOR_H/2, 0]} castShadow receiveShadow>
          <boxGeometry args={axis === 'x' ? [DOOR_W, FRAME_W, FRAME_T] : [FRAME_T, FRAME_W, DOOR_W]} />
          <meshStandardMaterial color="#5c4033" />
        </mesh>
      </RigidBody>

      {/* Top Wall Section */}
      {topH > 0.01 && (
        <RigidBody type="fixed" position={axis === 'x' ? [0, DOOR_H/2 + topH/2 + 0.05, 0] : [0, DOOR_H/2 + topH/2 + 0.05, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={axis === 'x' ? [DOOR_W, topH + 0.1, T] : [T, topH + 0.1, DOOR_W]} />
            <meshStandardMaterial color={wallColor} />
          </mesh>
        </RigidBody>
      )}

      {/* Door Leaf */}
      {!isDoorway && (isSliding ? (
        <RigidBody ref={rbRef} type="kinematicPosition" position={[0, 0, 0]}>
          <mesh castShadow receiveShadow userData={{ interactable: true, id, type: isLocked ? 'locked_door' : (isExit ? 'exit_door' : 'interior_door') }}>
            <boxGeometry args={axis === 'x' ? [ACTUAL_DOOR_W, DOOR_H, T * 0.6] : [T * 0.6, DOOR_H, ACTUAL_DOOR_W]} />
            <meshStandardMaterial color={isExit ? "#8B4513" : "#A0522D"} transparent opacity={0.9} />
            {isLocked && (
              <group position={axis === 'x' ? [slideDir > 0 ? -ACTUAL_DOOR_W/2 + 0.15 : ACTUAL_DOOR_W/2 - 0.15, 0, 0] : [0, 0, slideDir > 0 ? -ACTUAL_DOOR_W/2 + 0.15 : ACTUAL_DOOR_W/2 - 0.15]}>
                {/* Front Keypad */}
                <mesh position={axis === 'x' ? [0, 0, T*0.35] : [T*0.35, 0, 0]} userData={{ interactable: true, id, type: 'keypad' }}>
                  <boxGeometry args={axis === 'x' ? [0.15, 0.25, 0.05] : [0.05, 0.25, 0.15]} />
                  <meshStandardMaterial color="#222" />
                </mesh>
                {/* Back Keypad */}
                <mesh position={axis === 'x' ? [0, 0, -T*0.35] : [-T*0.35, 0, 0]} userData={{ interactable: true, id, type: 'keypad' }}>
                  <boxGeometry args={axis === 'x' ? [0.15, 0.25, 0.05] : [0.05, 0.25, 0.15]} />
                  <meshStandardMaterial color="#222" />
                </mesh>
              </group>
            )}
          </mesh>
          <CuboidCollider args={axis === 'x' ? [ACTUAL_DOOR_W/2, DOOR_H/2, T/2] : [T/2, DOOR_H/2, ACTUAL_DOOR_W/2]} />
        </RigidBody>
      ) : (
        <RigidBody ref={rbRef} type="kinematicPosition" position={pivotPos}>
          <mesh castShadow receiveShadow position={meshOffset as [number,number,number]} userData={{ interactable: true, id, type: isLocked ? 'locked_door' : (isExit ? 'exit_door' : 'interior_door') }}>
            <boxGeometry args={axis === 'x' ? [ACTUAL_DOOR_W, DOOR_H, T * 0.6] : [T * 0.6, DOOR_H, ACTUAL_DOOR_W]} />
            <meshStandardMaterial color={isExit ? "#8B4513" : "#A0522D"} transparent opacity={0.9} />
            {isLocked && (
              <group position={axis === 'x' ? [isSliding ? (slideDir > 0 ? -ACTUAL_DOOR_W/2 + 0.15 : ACTUAL_DOOR_W/2 - 0.15) : ACTUAL_DOOR_W/2 - 0.15, 0, 0] : [0, 0, isSliding ? (slideDir > 0 ? -ACTUAL_DOOR_W/2 + 0.15 : ACTUAL_DOOR_W/2 - 0.15) : ACTUAL_DOOR_W/2 - 0.15]}>
                {/* Front Keypad */}
                <mesh position={axis === 'x' ? [0, 0, T*0.35] : [T*0.35, 0, 0]} userData={{ interactable: true, id, type: 'keypad' }}>
                  <boxGeometry args={axis === 'x' ? [0.15, 0.25, 0.05] : [0.05, 0.25, 0.15]} />
                  <meshStandardMaterial color="#222" />
                </mesh>
                {/* Back Keypad */}
                <mesh position={axis === 'x' ? [0, 0, -T*0.35] : [-T*0.35, 0, 0]} userData={{ interactable: true, id, type: 'keypad' }}>
                  <boxGeometry args={axis === 'x' ? [0.15, 0.25, 0.05] : [0.05, 0.25, 0.15]} />
                  <meshStandardMaterial color="#222" />
                </mesh>
              </group>
            )}
          </mesh>
          <CuboidCollider position={meshOffset as [number,number,number]} args={axis === 'x' ? [ACTUAL_DOOR_W/2, DOOR_H/2, ACTUAL_DOOR_W/2] : [ACTUAL_DOOR_W/2, DOOR_H/2, ACTUAL_DOOR_W/2]} />
        </RigidBody>
      ))}
    </group>
  );
}


function Window({ struct }: { struct: any }) {
  // Make window slightly thicker than the wall (T) to prevent z-fighting
  const windowT = T + 0.02;
  const frameT = T + 0.04;

  const gameTime = useStore(s => s.gameTime);
  const sunOffset = useStore(s => s.sunOffset);
  
  const totalMinutes = (gameTime + sunOffset) % 1440;
  const angle = ((totalMinutes - 720) / 720) * Math.PI;
  const elevation = Math.sin((totalMinutes - 360) / 720 * Math.PI) * 0.8;
  const isDay = elevation > 0;
  const skyColor = isDay ? new THREE.Color('#aaccff').lerp(new THREE.Color('#ffffff'), elevation) : new THREE.Color('#1a1a2e');
  const sunColor = isDay ? new THREE.Color('#fff5e6').lerp(new THREE.Color('#ffffff'), elevation) : new THREE.Color('#1a1a2e');
  
  const sunX = -Math.sin(angle) * 100;
  const sunZ = -Math.cos(angle) * 100;
  const sunY = Math.max(elevation * 100, -10);

  return (
    <group position={[struct.position[0], struct.position[1] || 1.5, struct.position[2]]} rotation={[0, struct.rotation, 0]}>
      {/* Glass / Screen */}
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={[0.8, 1.2, windowT]} />
        <MeshPortalMaterial blur={0} resolution={512}>
          <color attach="background" args={[skyColor]} />
          <ambientLight intensity={isDay ? 0.5 : 0.1} />
          {isDay && (
            <directionalLight 
              position={[sunX, sunY, sunZ]} 
              intensity={1.5} 
              color={sunColor} 
            />
          )}
          <group position={[-struct.position[0], -(struct.position[1] || 1.5), -struct.position[2]]}>
            <Landscape />
          </group>
        </MeshPortalMaterial>
      </mesh>

      {/* Frame Top */}
      <mesh position={[0, 0.625, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.05, frameT]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Frame Bottom */}
      <mesh position={[0, -0.625, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.05, frameT]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Frame Left */}
      <mesh position={[-0.425, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 1.2, frameT]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Frame Right */}
      <mesh position={[0.425, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.05, 1.2, frameT]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function WindowLight({ windowStruct, disableSpotLight }: { windowStruct: any, disableSpotLight?: boolean }) {
  const target = React.useMemo(() => new THREE.Object3D(), []);
  
  const gameTime = useStore(s => s.gameTime);
  const sunOffset = useStore(s => s.sunOffset);
  
  const totalMinutes = (gameTime + sunOffset) % 1440;
  const angle = ((totalMinutes - 720) / 720) * Math.PI;
  const elevation = Math.sin((totalMinutes - 360) / 720 * Math.PI) * 0.8;
  
  const sunX = -Math.sin(angle);
  const sunZ = -Math.cos(angle);
  const sunY = Math.max(elevation, -0.1);
  
  const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
  
  const rotY = windowStruct.rotation || 0;
  const normal = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY));
  
  const dot = normal.dot(sunDir);
  const isDay = elevation > 0;
  
  const baseIntensity = isDay ? Math.min(elevation * 3, 1.5) : 0;
  const spotIntensity = Math.max(0, dot) * baseIntensity * 15;
  const ambientIntensity = isDay ? baseIntensity * 1.5 : 0;
  
  const color = isDay ? new THREE.Color('#fff5e6').lerp(new THREE.Color('#ffffff'), elevation) : new THREE.Color('#1a1a2e');
  const ambientColor = isDay ? new THREE.Color('#aaccff').lerp(new THREE.Color('#ffffff'), elevation) : new THREE.Color('#1a1a2e');
  
  const spotPos = new THREE.Vector3(windowStruct.position[0], windowStruct.position[1] || 1.5, windowStruct.position[2]);
  
  // Target is along the light ray direction (-sunDir)
  target.position.copy(spotPos).add(new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z).multiplyScalar(5));
  
  return (
    <group>
      <primitive object={target} />
      
      {/* Soft portal light */}
      {ambientIntensity > 0.01 && (
        <pointLight
          position={[spotPos.x - normal.x * 0.5, spotPos.y, spotPos.z - normal.z * 0.5]}
          intensity={ambientIntensity}
          color={ambientColor}
          distance={10}
          decay={2}
        />
      )}

      {/* Direct sun beam */}
      {!disableSpotLight && spotIntensity > 0.01 && (
        <spotLight
          position={[spotPos.x, spotPos.y, spotPos.z]}
          target={target}
          intensity={spotIntensity}
          color={color}
          angle={Math.PI / 6}
          penumbra={0.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.001}
          shadow-normalBias={0.01}
        />
      )}
    </group>
  );
}

export function Room() {
  const layout = useStore(s => s.layout);
  const setLayout = useStore(s => s.setLayout);
  const internalStructures = useStore(s => s.internalStructures);
  const gameTime = useStore(s => s.gameTime);
  const buildMode = useStore(s => s.buildMode);

  useEffect(() => {
    // Initialize floorCells for default layout
    const physicalCells = new Set<string>();
    DEFAULT.cells.forEach(c => {
      const cx = (c.x - DEFAULT.minX) * TILE + TILE / 2;
      const cz = (c.y - DEFAULT.minY) * TILE + TILE / 2;
      physicalCells.add(`${cx},${cz}`);
    });
    useStore.getState().setFloorCells(physicalCells);
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ENTER_INTERIOR' && e.data.building) {
        const b = e.data.building;
        
        let rawCells = b.cells;
        if (!rawCells) {
          // Fallback для старого формату
          rawCells = [];
          for(let x=0; x<(b.roomWidth || 6); x++) {
            for(let y=0; y<(b.roomDepth || 6); y++) {
               rawCells.push({ x: (b.minX || 0) + x, y: (b.minY || 0) + y, type: 1 });
            }
          }
          b.doors?.forEach((d: any) => {
             const cell = rawCells.find((c: any) => c.x === d.x && c.y === d.y);
             if (cell) cell.type = 2;
          });
        }

        if (rawCells.length === 0) return;

        const minX = Math.min(...rawCells.map((c: any) => c.x));
        const maxX = Math.max(...rawCells.map((c: any) => c.x));
        const minY = Math.min(...rawCells.map((c: any) => c.y));
        const maxY = Math.max(...rawCells.map((c: any) => c.y));

        const gridW = maxX - minX + 3;
        const gridH = maxY - minY + 3;
        const grid = Array(gridH).fill(0).map(() => Array(gridW).fill(0));

        const doorConfigs: Record<string, any> = {};

        rawCells.forEach((c: any) => {
          grid[c.y - minY + 1][c.x - minX + 1] = c.type;
          if (c.type === 2 || c.type === 3) {
             const id = `door_${c.x}_${c.y}`;
             doorConfigs[id] = c.config || (c.type === 3 ? { pin: '12345', trustedNeedsPin: true } : null);
          }
        });
        
        const initialDoors: Record<string, boolean> = {};
        b.doors?.forEach((door: any) => {
          initialDoors[door.id] = false;
        });
        
        // Add internal doors to initial state so they can be toggled
        b.internalStructures?.forEach((struct: any) => {
          if ((struct.type === 'door' || struct.type === 'locked_door') && struct.id) {
            initialDoors[struct.id] = false;
          }
        });

        useStore.setState({
          inventory: b.inventory || useStore.getState().inventory,
          materials: b.materials || useStore.getState().materials,
          internalStructures: b.internalStructures || [],
          playerRole: b.role || 'owner',
          doorStates: initialDoors,
          doorConfigs: doorConfigs
        });

        // Flood-fill ззовні (0,0), щоб знайти всі "зовнішні" клітинки
        const queue = [[0, 0]];
        grid[0][0] = -1; // -1 = outside

        while (queue.length > 0) {
          const [qx, qy] = queue.shift()!;
          const neighbors = [
            [qx - 1, qy], [qx + 1, qy], [qx, qy - 1], [qx, qy + 1]
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              if (grid[ny][nx] === 0) {
                grid[ny][nx] = -1;
                queue.push([nx, ny]);
              }
            }
          }
        }

        const processedCells: Cell[] = [];
        for (let y = 0; y < gridH; y++) {
          for (let x = 0; x < gridW; x++) {
            const worldX = x + minX - 1;
            const worldY = y + minY - 1;
            const val = grid[y][x];

            if (val === -1) continue; // Зовнішня порожнеча

            if (val === 0) {
              // Внутрішня порожнеча (не зачеплена flood-fill) -> стає Підлогою
              processedCells.push({ x: worldX, y: worldY, type: 1 });
              grid[y][x] = 1; // Mark as floor so walls aren't built around it
            } else if (val >= 1 && val <= 6) {
              // Намальована клітинка. Перевіряємо, чи торкається вона "зовнішнього" світу (навіть по діагоналі)
              let touchesOutside = false;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0) continue;
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
                    if (grid[ny][nx] === -1) touchesOutside = true;
                  } else {
                    touchesOutside = true; // За межами сітки = outside
                  }
                }
              }
              
              if (touchesOutside) {
                // Це контур кімнати -> стає Підлогою або Дверима
                processedCells.push({ x: worldX, y: worldY, type: val });
              } else {
                // Внутрішня клітинка, яка не торкається outside.
                // Вона теж стає підлогою, щоб не було колон!
                processedCells.push({ x: worldX, y: worldY, type: val });
              }
            }
          }
        }

        const layoutMinX = Math.min(...processedCells.map(c => c.x));
        const layoutMinY = Math.min(...processedCells.map(c => c.y));

        const physicalCells = new Set<string>();
        processedCells.forEach(c => {
          const cx = (c.x - layoutMinX) * TILE + TILE / 2;
          const cz = (c.y - layoutMinY) * TILE + TILE / 2;
          physicalCells.add(`${cx},${cz}`);
        });
        useStore.getState().setFloorCells(physicalCells);

        setLayout({
          cells: processedCells,
          minX: layoutMinX,
          minY: layoutMinY,
          wallHeight: b.wallHeight ?? 3,
          grid: grid
        });

        const doorCell = processedCells.find((c: any) => c.type === 2) || processedCells[0];
        if (doorCell) {
          const cx = (doorCell.x - layoutMinX) * TILE + TILE / 2;
          const cz = (doorCell.y - layoutMinY) * TILE + TILE / 2;
          
          const hasN = processedCells.some((c: any) => c.x === doorCell.x && c.y === doorCell.y - 1);
          const hasS = processedCells.some((c: any) => c.x === doorCell.x && c.y === doorCell.y + 1);
          const hasW = processedCells.some((c: any) => c.x === doorCell.x - 1 && c.y === doorCell.y);
          const hasE = processedCells.some((c: any) => c.x === doorCell.x + 1 && c.y === doorCell.y);

          let rotY = 0;
          if (!hasN) rotY = Math.PI; 
          else if (!hasS) rotY = 0; 
          else if (!hasW) rotY = Math.PI / 2; 
          else if (!hasE) rotY = -Math.PI / 2; 

          useStore.getState().setSpawn({ pos: [cx, 1, cz], rotY });
        }
      } else if (e.data?.type === 'CLOSE_ALL_DOORS') {
        useStore.getState().closeAllDoors();
      } else if (e.data?.type === 'OPEN_ALL_DOORS') {
        const state = useStore.getState();
        const newStates: Record<string, boolean> = {};
        
        // Open all exterior doors
        Object.keys(state.doorConfigs).forEach(id => {
          newStates[id] = true;
        });
        
        // Open all internal doors
        state.internalStructures.forEach(struct => {
          if (struct.type === 'door' || struct.type === 'locked_door') {
            newStates[struct.id] = true;
          }
        });
        
        useStore.setState({ doorStates: newStates });
      }
    };

    window.addEventListener('message', handler);
    window.parent.postMessage({ type: 'INTERIOR_READY' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const { cells, minX, minY, wallHeight: H, grid } = layout;
  const cellMap = new Set(cells.map(c => `${c.x},${c.y}`));
  const isSolid = (x: number, y: number) => cellMap.has(`${x},${y}`);
  const isOutside = (x: number, y: number) => {
    if (!grid) return true;
    const gx = x - minX + 1;
    const gy = y - minY + 1;
    if (gx < 0 || gx >= grid[0].length || gy < 0 || gy >= grid.length) return true;
    return grid[gy][gx] === -1;
  };

  // Знаходимо всі унікальні вершини (кути) клітинок
  const vertices = new Set<string>();
  cells.forEach(c => {
    vertices.add(`${c.x},${c.y}`);
    vertices.add(`${c.x+1},${c.y}`);
    vertices.add(`${c.x},${c.y+1}`);
    vertices.add(`${c.x+1},${c.y+1}`);
  });

  const pillars: {px: number, pz: number, isOuter: boolean}[] = [];
  vertices.forEach(v => {
    const [vx, vy] = v.split(',').map(Number);
    const TL = isSolid(vx-1, vy-1);
    const TR = isSolid(vx, vy-1);
    const BL = isSolid(vx-1, vy);
    const BR = isSolid(vx, vy);

    const px = (vx - minX) * TILE;
    const pz = (vy - minY) * TILE;

    // Стовп у верхньому лівому куті відносно вершини (всередині TL клітинки)
    if (!TL && ((BR && !TR && !BL) || (TR && BL))) {
      pillars.push({ px: px - T/2, pz: pz - T/2, isOuter: !TL || !TR || !BL || !BR });
    }
    // Стовп у верхньому правому куті (всередині TR клітинки)
    if (!TR && ((BL && !TL && !BR) || (TL && BR))) {
      pillars.push({ px: px + T/2, pz: pz - T/2, isOuter: !TL || !TR || !BL || !BR });
    }
    // Стовп у нижньому лівому куті (всередині BL клітинки)
    if (!BL && ((TR && !TL && !BR) || (TL && BR))) {
      pillars.push({ px: px - T/2, pz: pz + T/2, isOuter: !TL || !TR || !BL || !BR });
    }
    // Стовп у нижньому правому куті (всередині BR клітинки)
    if (!BR && ((TL && !TR && !BL) || (TR && BL))) {
      pillars.push({ px: px + T/2, pz: pz + T/2, isOuter: !TL || !TR || !BL || !BR });
    }
  });

  let maxX = minX, maxY = minY;
  cells.forEach(c => {
    if (c.x > maxX) maxX = c.x;
    if (c.y > maxY) maxY = c.y;
  });
  const gridW = (maxX - minX + 1) * TILE;
  const gridD = (maxY - minY + 1) * TILE;
  const gridCx = gridW / 2;
  const gridCz = gridD / 2;

  // Generate outer walls and initial doors
  let rawOuterWalls: any[] = [];
  const initialDoors: any[] = [];
  
  cells.forEach(c => {
    const neighbors = [
      { x: c.x + 1, y: c.y, dx: 1, dz: 0, rot: 0, off: [TILE/2, 0] },
      { x: c.x - 1, y: c.y, dx: -1, dz: 0, rot: 0, off: [-TILE/2, 0] },
      { x: c.x, y: c.y + 1, dx: 0, dz: 1, rot: Math.PI/2, off: [0, TILE/2] },
      { x: c.x, y: c.y - 1, dx: 0, dz: -1, rot: Math.PI/2, off: [0, -TILE/2] },
    ];
    
    neighbors.forEach(n => {
      if (!cellMap.has(`${n.x},${n.y}`)) {
        const cx = (c.x - minX) * TILE + TILE / 2;
        const cz = (c.y - minY) * TILE + TILE / 2;
        
        const start: [number, number] = n.dz === 0 
          ? [cx + n.off[0], cz - TILE/2] 
          : [cx - TILE/2, cz + n.off[1]];
        const end: [number, number] = n.dz === 0 
          ? [cx + n.off[0], cz + TILE/2] 
          : [cx + TILE/2, cz + n.off[1]];
          
        const wallId = `outer-${c.x}-${c.y}-${n.dx}-${n.dz}`;
        rawOuterWalls.push({
          id: wallId,
          type: 'vector_wall',
          material: 'concrete', // Foundation walls
          position: [0, 0, 0],
          rotation: 0,
          start,
          end,
          offset: [0, 0]
        });
        
        // If this cell has a door, place it on the first available outer wall
        if ((c.type === 2 || c.type === 3) && !initialDoors.some(d => d.cellId === `${c.x},${c.y}`)) {
          let doorRot = 0;
          if (n.dx === 1) doorRot = -Math.PI/2;
          else if (n.dx === -1) doorRot = Math.PI/2;
          else if (n.dz === 1) doorRot = Math.PI;
          else if (n.dz === -1) doorRot = 0;
          
          initialDoors.push({
            id: `door_${c.x}_${c.y}`,
            cellId: `${c.x},${c.y}`,
            type: c.type === 3 ? 'locked_door' : 'door',
            position: [cx + n.off[0], 0, cz + n.off[1]],
            rotation: doorRot,
            parentWallId: wallId, // Will be updated after merge
            originalWallId: wallId,
            isExit: true
          });
        }
      }
    });
  });

  // Merge collinear outer walls
  const outerWalls: any[] = [];
  
  const hWalls = rawOuterWalls.filter(w => Math.abs(w.start[1] - w.end[1]) < 0.01);
  const vWalls = rawOuterWalls.filter(w => Math.abs(w.start[0] - w.end[0]) < 0.01);

  const hGroups = new Map<number, any[]>();
  hWalls.forEach(w => {
    const z = Math.round(w.start[1] * 100) / 100;
    if (!hGroups.has(z)) hGroups.set(z, []);
    hGroups.get(z)!.push(w);
  });

  hGroups.forEach((walls, z) => {
    walls.sort((a, b) => Math.min(a.start[0], a.end[0]) - Math.min(b.start[0], b.end[0]));
    let current = { ...walls[0] };
    let currentIds = [current.id];
    for (let i = 1; i < walls.length; i++) {
      const next = walls[i];
      const currentMaxX = Math.max(current.start[0], current.end[0]);
      const nextMinX = Math.min(next.start[0], next.end[0]);
      if (Math.abs(currentMaxX - nextMinX) < 0.01) {
        current.end = [Math.max(next.start[0], next.end[0]), z];
        current.start = [Math.min(current.start[0], current.end[0]), z];
        currentIds.push(next.id);
      } else {
        outerWalls.push(current);
        initialDoors.forEach(d => { if (currentIds.includes(d.originalWallId)) d.parentWallId = current.id; });
        current = { ...next };
        currentIds = [current.id];
      }
    }
    outerWalls.push(current);
    initialDoors.forEach(d => { if (currentIds.includes(d.originalWallId)) d.parentWallId = current.id; });
  });

  const vGroups = new Map<number, any[]>();
  vWalls.forEach(w => {
    const x = Math.round(w.start[0] * 100) / 100;
    if (!vGroups.has(x)) vGroups.set(x, []);
    vGroups.get(x)!.push(w);
  });

  vGroups.forEach((walls, x) => {
    walls.sort((a, b) => Math.min(a.start[1], a.end[1]) - Math.min(b.start[1], b.end[1]));
    let current = { ...walls[0] };
    let currentIds = [current.id];
    for (let i = 1; i < walls.length; i++) {
      const next = walls[i];
      const currentMaxZ = Math.max(current.start[1], current.end[1]);
      const nextMinZ = Math.min(next.start[1], next.end[1]);
      if (Math.abs(currentMaxZ - nextMinZ) < 0.01) {
        current.end = [x, Math.max(next.start[1], next.end[1])];
        current.start = [x, Math.min(current.start[1], current.end[1])];
        currentIds.push(next.id);
      } else {
        outerWalls.push(current);
        initialDoors.forEach(d => { if (currentIds.includes(d.originalWallId)) d.parentWallId = current.id; });
        current = { ...next };
        currentIds = [current.id];
      }
    }
    outerWalls.push(current);
    initialDoors.forEach(d => { if (currentIds.includes(d.originalWallId)) d.parentWallId = current.id; });
  });

  const allStructures = [...internalStructures, ...outerWalls, ...initialDoors];

  const floorShapes = useMemo(() => {
    if (cells.length === 0) return [];
    
    const edges: {start: [number, number], end: [number, number]}[] = [];
    
    cells.forEach(c => {
      const cx = (c.x - minX) * TILE + TILE / 2;
      const cz = (c.y - minY) * TILE + TILE / 2;
      const t2 = TILE / 2;
      
      if (!cellMap.has(`${c.x},${c.y-1}`)) edges.push({ start: [cx - t2, cz - t2], end: [cx + t2, cz - t2] });
      if (!cellMap.has(`${c.x+1},${c.y}`)) edges.push({ start: [cx + t2, cz - t2], end: [cx + t2, cz + t2] });
      if (!cellMap.has(`${c.x},${c.y+1}`)) edges.push({ start: [cx + t2, cz + t2], end: [cx - t2, cz + t2] });
      if (!cellMap.has(`${c.x-1},${c.y}`)) edges.push({ start: [cx - t2, cz + t2], end: [cx - t2, cz - t2] });
    });
    
    const loops: THREE.Vector2[][] = [];
    const edgeMap = new Map<string, any>();
    edges.forEach(e => edgeMap.set(`${e.start[0].toFixed(3)},${e.start[1].toFixed(3)}`, e));
    
    while(edgeMap.size > 0) {
      const firstKey = edgeMap.keys().next().value;
      let currentEdge = edgeMap.get(firstKey);
      edgeMap.delete(firstKey);
      
      const loop: THREE.Vector2[] = [];
      loop.push(new THREE.Vector2(currentEdge.start[0], currentEdge.start[1]));
      
      let currentKey = `${currentEdge.end[0].toFixed(3)},${currentEdge.end[1].toFixed(3)}`;
      while(edgeMap.has(currentKey)) {
        currentEdge = edgeMap.get(currentKey);
        edgeMap.delete(currentKey);
        loop.push(new THREE.Vector2(currentEdge.start[0], currentEdge.start[1]));
        currentKey = `${currentEdge.end[0].toFixed(3)},${currentEdge.end[1].toFixed(3)}`;
      }
      loops.push(loop);
    }
    
    const shapes: THREE.Shape[] = [];
    const holes: THREE.Path[] = [];
    
    loops.forEach(loop => {
      let area = 0;
      for (let i = 0; i < loop.length; i++) {
        const j = (i + 1) % loop.length;
        area += loop[i].x * loop[j].y - loop[j].x * loop[i].y;
      }
      area = area / 2;
      
      if (area > 0) {
        shapes.push(new THREE.Shape(loop));
      } else {
        holes.push(new THREE.Path(loop));
      }
    });
    
    holes.forEach(hole => {
      const pt = hole.getPoints()[0];
      for (const shape of shapes) {
        const vs = shape.getPoints();
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          let xi = vs[i].x, yi = vs[i].y;
          let xj = vs[j].x, yj = vs[j].y;
          let intersect = ((yi > pt.y) != (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) {
          shape.holes.push(hole);
          break;
        }
      }
    });
    
    return shapes;
  }, [cells, minX, minY, cellMap]);

  const totalWindows = allStructures.filter(s => s.type === 'window').length;

  return (
    <>
      <RigidBody type="fixed" position={[0, -1, 0]}>
        <CuboidCollider args={[1000, 0.5, 1000]} />
      </RigidBody>

      {SHOW_GRID && buildMode && (
        <gridHelper 
          args={[Math.max(gridW, gridD) + 10, Math.max(gridW, gridD) + 10, '#ff4444', '#444444']} 
          position={[gridCx, 0.01, gridCz]} 
        />
      )}

      {floorShapes.length > 0 && (
        <group key={`room-geometry-${cells.length}-${minX}-${minY}`}>
          <RigidBody type="fixed" position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
            <mesh receiveShadow>
              <extrudeGeometry args={[floorShapes, { depth: 0.25, bevelEnabled: false }]} />
              <meshStandardMaterial color="#8B7355" roughness={0.9} />
            </mesh>
          </RigidBody>

          <RigidBody type="fixed" position={[0, H + 0.25, 0]} rotation={[Math.PI/2, 0, 0]}>
            <mesh castShadow receiveShadow>
              <extrudeGeometry args={[floorShapes, { depth: 0.25, bevelEnabled: false }]} />
              <meshStandardMaterial color="#d4cfc8" roughness={0.9} />
            </mesh>
          </RigidBody>
        </group>
      )}

      {buildMode && pillars.map((p) => (
        <SolidWall key={`pillar-${p.px}-${p.pz}-${cells.length}`} pos={[p.px, H/2, p.pz]} size={[T + 0.1, H + 0.5, T + 0.1]} />
      ))}

      {allStructures.map(struct => {
        if (struct.type === 'window') {
          return (
            <React.Fragment key={`${struct.id}-${cells.length}`}>
              <Window struct={struct} />
              {!buildMode && <WindowLight windowStruct={struct} disableSpotLight={totalWindows > 4} />}
            </React.Fragment>
          );
        }

        if (struct.type === 'vector_wall' && struct.start && struct.end) {
          if (!buildMode) {
            return <CompiledWall key={`compiled-${struct.id}-${cells.length}`} struct={struct} allStructures={allStructures} H={H} T={T} />;
          }

          const dx = struct.end[0] - struct.start[0];
          const dz = struct.end[1] - struct.start[1];
          const len = Math.max(Math.hypot(dx, dz), 0.1);
          const cx = (struct.start[0] + struct.end[0]) / 2;
          const cz = (struct.start[1] + struct.end[1]) / 2;
          const rotY = -Math.atan2(dz, dx);
          const color = struct.material === 'wood' ? '#8B5A2B' : struct.material === 'brick' ? '#B22222' : '#A9A9A9';
          
          const offX = struct.offset ? struct.offset[0] : 0;
          const offZ = struct.offset ? struct.offset[1] : 0;

          // Find all openings to check for intersections
          const allOpenings = allStructures.filter(s => 
            (s.type.includes('door') || s.type === 'doorway') && s.parentWallId === struct.id
          );

          const dirX = dx / len;
          const dirZ = dz / len;

          // Calculate intervals
          const intervals: {start: number, end: number, type: string, y?: number}[] = [];
          allOpenings.forEach(opening => {
            const px = opening.position[0] - offX;
            const pz = opening.position[2] - offZ;
            const vx = px - struct.start![0];
            const vz = pz - struct.start![1];
            const d = vx * dirX + vz * dirZ;
            
            const width = opening.type === 'window' ? 0.9 : DOOR_W;
            intervals.push({ start: d - width/2, end: d + width/2, type: opening.type, y: opening.position[1] });
          });

          // Sort intervals
          intervals.sort((a, b) => a.start - b.start);

          // Merge overlapping intervals
          const mergedIntervals: {start: number, end: number, type: string, y?: number}[] = [];
          if (intervals.length > 0) {
            let current = intervals[0];
            for (let i = 1; i < intervals.length; i++) {
              if (intervals[i].start <= current.end) {
                current.end = Math.max(current.end, intervals[i].end);
              } else {
                mergedIntervals.push(current);
                current = intervals[i];
              }
            }
            mergedIntervals.push(current);
          }

          // Create wall segments
          const segments: {start: number, end: number}[] = [];
          let currentPos = 0;
          mergedIntervals.forEach(interval => {
            if (interval.start > currentPos) {
              segments.push({ start: currentPos, end: interval.start });
            }
            currentPos = interval.end;
          });
          if (currentPos < len) {
            segments.push({ start: currentPos, end: len });
          }

          return (
            <group key={struct.id} userData={{ id: struct.id, type: 'wall' }}>
              {segments.map((seg, idx) => {
                const segLen = seg.end - seg.start;
                if (segLen <= 0.01) return null;
                const segCx = struct.start![0] + dirX * (seg.start + seg.end) / 2;
                const segCz = struct.start![1] + dirZ * (seg.start + seg.end) / 2;

                return (
                  <SolidWall 
                    key={`seg-${idx}-${segLen.toFixed(3)}`} 
                    pos={[segCx + offX, H/2, segCz + offZ]} 
                    size={[segLen + 0.1, H + 0.5, T]} 
                    rotation={[0, rotY, 0]} 
                    color={color} 
                    userData={{ id: struct.id, type: 'wall' }}
                  />
                );
              })}

              {/* Render headers and sills for openings */}
              {mergedIntervals.map((interval, idx) => {
                const intLen = interval.end - interval.start;
                const intCx = struct.start![0] + dirX * (interval.start + interval.end) / 2;
                const intCz = struct.start![1] + dirZ * (interval.start + interval.end) / 2;
                
                const headerH = H - DOOR_H;
                const headerY = H - headerH / 2;
                
                return (
                  <group key={`opening-fill-${idx}`}>
                    {headerH > 0.01 && (
                      <SolidWall 
                        pos={[intCx + offX, headerY + 0.05, intCz + offZ]} 
                        size={[intLen + 0.1, headerH + 0.1, T]} 
                        rotation={[0, rotY, 0]} 
                        color={color} 
                      />
                    )}
                  </group>
                );
              })}

              {/* Cylinders at joints to hide gaps */}
              {!mergedIntervals.some(inv => 0 >= inv.start && 0 <= inv.end) && (
                <RigidBody key={`cyl-start-${struct.id}-${cells.length}`} type="fixed" position={[struct.start[0] + offX, H/2, struct.start[1] + offZ]}>
                  <CylinderCollider args={[(H+0.2)/2, T/2]} />
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[T/2, T/2, H+0.2, 16]} />
                    <meshStandardMaterial color={color} />
                  </mesh>
                </RigidBody>
              )}
              {!mergedIntervals.some(inv => len >= inv.start && len <= inv.end) && (
                <RigidBody key={`cyl-end-${struct.id}-${cells.length}`} type="fixed" position={[struct.end[0] + offX, H/2, struct.end[1] + offZ]}>
                  <CylinderCollider args={[(H+0.2)/2, T/2]} />
                  <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[T/2, T/2, H+0.2, 16]} />
                    <meshStandardMaterial color={color} />
                  </mesh>
                </RigidBody>
              )}
            </group>
          );
        }

        // Rotation is in radians. If it's close to PI/2 or -PI/2, it's rotated.
        // Since we use 45 deg steps, we check if it's closer to vertical or horizontal.
        const normalizedRot = Math.abs(struct.rotation % Math.PI);
        const isRotated = normalizedRot > Math.PI / 4 && normalizedRot < 3 * Math.PI / 4;
        const size: [number, number, number] = isRotated ? [T, H, TILE] : [TILE, H, T];
        const pos: [number, number, number] = [struct.position[0], H/2, struct.position[2]];

        if (struct.type === 'partition') {
          const color = struct.material === 'wood' ? '#8B5A2B' : struct.material === 'brick' ? '#B22222' : '#A9A9A9';
          return <SolidWall key={struct.id} pos={pos} size={[size[0], H + 0.2, size[2]]} color={color} />;
        }

        if (struct.type === 'door' || struct.type === 'locked_door' || struct.type === 'doorway') {
          let color = struct.material === 'wood' ? '#8B5A2B' : struct.material === 'brick' ? '#B22222' : '#A9A9A9';
          if (struct.parentWallId) {
            const parentWall = allStructures.find(s => s.id === struct.parentWallId);
            if (parentWall) {
              color = parentWall.material === 'wood' ? '#8B5A2B' : parentWall.material === 'brick' ? '#B22222' : '#A9A9A9';
            }
          }
          
          const isExit = struct.isExit || false; // Internal doors are not exits
          
          // Automatic logic: if it's in a wall, it slides. Otherwise, it swings.
          const isSliding = !!struct.parentWallId;
          
          // Determine slide direction based on wall space
          let slideDir = 0;
          if (isSliding && struct.parentWallId) {
            const parentWall = allStructures.find(s => s.id === struct.parentWallId);
            if (parentWall && parentWall.start && parentWall.end) {
              const dx = parentWall.end[0] - parentWall.start[0];
              const dz = parentWall.end[1] - parentWall.start[1];
              const wallLen = Math.hypot(dx, dz);
              
              if (wallLen > 0.01) {
                // Find distance from wall start to door center
                const px = struct.position[0] - (parentWall.offset ? parentWall.offset[0] : 0);
                const pz = struct.position[2] - (parentWall.offset ? parentWall.offset[1] : 0);
                const vx = px - parentWall.start[0];
                const vz = pz - parentWall.start[1];
                const dirX = dx / wallLen;
                const dirZ = dz / wallLen;
                const d = vx * dirX + vz * dirZ;
                
                // Find nearest openings
                const otherOpenings = allStructures.filter(s => 
                  s.id !== struct.id && 
                  (s.type.includes('door') || s.type === 'doorway' || s.type === 'window') && 
                  s.parentWallId === struct.parentWallId
                );
                
                let nearestLeft = 0;
                let nearestRight = wallLen;
                
                otherOpenings.forEach(opening => {
                  const opx = opening.position[0] - (parentWall.offset ? parentWall.offset[0] : 0);
                  const opz = opening.position[2] - (parentWall.offset ? parentWall.offset[1] : 0);
                  const ovx = opx - parentWall.start[0];
                  const ovz = opz - parentWall.start[1];
                  const od = ovx * dirX + ovz * dirZ;
                  const oWidth = opening.type === 'window' ? 0.85 : DOOR_W;
                  
                  if (od < d) {
                    nearestLeft = Math.max(nearestLeft, od + oWidth/2);
                  } else {
                    nearestRight = Math.min(nearestRight, od - oWidth/2);
                  }
                });
                
                const spaceLeft = d - DOOR_W / 2 - nearestLeft;
                const spaceRight = nearestRight - (d + DOOR_W / 2);
                
                let rawSlideDir = 0;
                if (spaceLeft >= DOOR_W * 0.9) {
                  rawSlideDir = -1; // Slide towards start
                } else if (spaceRight >= DOOR_W * 0.9) {
                  rawSlideDir = 1; // Slide towards end
                } else {
                  rawSlideDir = 0; // Not enough space to slide, must swing
                }
                
                // Check if door is flipped relative to wall
                const wallRot = -Math.atan2(dz, dx);
                let rotDiff = Math.abs(struct.rotation - wallRot);
                // Normalize to 0..2PI
                rotDiff = rotDiff % (Math.PI * 2);
                const isFlipped = rotDiff > Math.PI / 2 && rotDiff < 3 * Math.PI / 2;
                
                slideDir = isFlipped ? -rawSlideDir : rawSlideDir;
              } else {
                slideDir = 0;
              }
            } else {
              slideDir = 0;
            }
          }
          
          return (
            <group key={struct.id} position={[struct.position[0], 0, struct.position[2]]} rotation={[0, struct.rotation, 0]}>
              <InteractiveDoor 
                id={struct.id} 
                axis="x" // We rotate the group, so local axis is always x
                pos={[0, DOOR_H/2, 0]} 
                slideDir={slideDir} 
                isExit={isExit} 
                isLocked={struct.type === 'locked_door'}
                isDoorway={struct.type === 'doorway'}
                wallColor={color}
                wallHeight={H}
              />
            </group>
          );
        }



        if (struct.type === 'wall_light') {
          return (
            <group key={struct.id} position={[struct.position[0], struct.position[1], struct.position[2]]} rotation={[0, struct.rotation, 0]}>
              <mesh>
                <boxGeometry args={[0.2, 0.1, 0.1]} />
                <meshStandardMaterial color="#333" />
              </mesh>
              <pointLight intensity={5} distance={10} decay={2} color="#ffcc88" castShadow shadow-bias={-0.0001} />
            </group>
          );
        }

        if (struct.type === 'ceiling_light') {
          return (
            <group key={struct.id} position={[struct.position[0], H - 0.1, struct.position[2]]}>
              <mesh>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
                <meshStandardMaterial color="#eee" emissive="#fff" emissiveIntensity={2} />
              </mesh>
              <pointLight position={[0, -0.2, 0]} intensity={10} distance={20} decay={2} color="#ffffff" castShadow shadow-bias={-0.0001} />
            </group>
          );
        }
        return null;
      })}
    </>
  );
}
