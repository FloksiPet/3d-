import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DEFAULT, TILE, T } from '../constants';
import { useStore } from '../store';

export function BuildSystem() {
  const buildMode = useStore(s => s.buildMode);
  const buildTool = useStore(s => s.buildTool);
  const addInternalStructure = useStore(s => s.addInternalStructure);
  const ghostRotation = useStore(s => s.ghostRotation);
  const setGhostRotation = useStore(s => s.setGhostRotation);
  const wallStartPoint = useStore(s => s.wallStartPoint);
  const setWallStartPoint = useStore(s => s.setWallStartPoint);
  const floorCells = useStore(s => s.floorCells);
  const materials = useStore(s => s.materials);
  const { camera, scene } = useThree();
  const ghostRef = useRef<THREE.Group>(null);
  const pointerSnapRef = useRef<[number, number]>([0, 0]);
  const currentOffsetRef = useRef<[number, number]>([0, 0]);
  const [rotIndex, setRotIndex] = useState(0); // 0 = 0 deg, 1 = 90 deg

  const interact = useStore(s => s.keys.interact);
  const [prevInteract, setPrevInteract] = useState(false);

  useEffect(() => {
    if (interact && !prevInteract) {
      window.dispatchEvent(new CustomEvent('build-action'));
    }
    setPrevInteract(interact);
  }, [interact, prevInteract]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!buildMode) return;
      if (e.key === 'Escape') {
        setWallStartPoint(null);
        useStore.getState().setBuildTool(null);
      }
      if (e.key === 'r' || e.key === 'R') {
        setGhostRotation(prev => prev + Math.PI / 4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buildMode, setGhostRotation, setWallStartPoint]);

  const closestWallRef = useRef<string | null>(null);
  const minWallDistRef = useRef<number>(1);

  useFrame(() => {
    if (!buildMode || !buildTool || !ghostRef.current) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    let target = new THREE.Vector3();
    let hitFound = false;

    const intersects = raycaster.intersectObjects(scene.children, true);
    const validIntersects = intersects.filter(i => {
      let obj: any = i.object;
      while (obj) {
        if (obj === ghostRef.current) return false;
        // Ignore player capsule if it has a specific name or userData, assuming it might be 'player'
        if (obj.name === 'player') return false;
        obj = obj.parent;
      }
      return true;
    });

    if (validIntersects.length > 0) {
      target.copy(validIntersects[0].point);
      hitFound = true;
    } else {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      if (raycaster.ray.intersectPlane(plane, target)) {
        hitFound = true;
      }
    }

    if (hitFound) {
      const isFineSnap = buildTool.startsWith('wall_light') || buildTool.startsWith('ceiling_light');
      const snapRes = isFineSnap ? 10 : 2;
      let snapX = Math.round(target.x * snapRes) / snapRes;
      let snapZ = Math.round(target.z * snapRes) / snapRes;

      const structures = useStore.getState().internalStructures;
      const layout = useStore.getState().layout;
      const internalWalls = structures.filter(s => s.type === 'vector_wall' && s.start && s.end);
      
      // Calculate outer walls from current layout
      const outerWalls: any[] = [];
      const cellMap = new Map<string, boolean>();
      layout.cells.forEach(c => cellMap.set(`${c.x},${c.y}`, true));
      
      layout.cells.forEach(c => {
        const neighbors = [
          { x: c.x + 1, y: c.y, dx: 1, dz: 0, rot: 0, off: [TILE/2, 0] },
          { x: c.x - 1, y: c.y, dx: -1, dz: 0, rot: 0, off: [-TILE/2, 0] },
          { x: c.x, y: c.y + 1, dx: 0, dz: 1, rot: Math.PI/2, off: [0, TILE/2] },
          { x: c.x, y: c.y - 1, dx: 0, dz: -1, rot: Math.PI/2, off: [0, -TILE/2] },
        ];
        
        neighbors.forEach(n => {
          if (!cellMap.has(`${n.x},${n.y}`)) {
            // This is an outer edge
            const cx = (c.x - layout.minX) * TILE + TILE / 2;
            const cz = (c.y - layout.minY) * TILE + TILE / 2;
            
            const start: [number, number] = n.dz === 0 
              ? [cx + n.off[0], cz - TILE/2] 
              : [cx - TILE/2, cz + n.off[1]];
            const end: [number, number] = n.dz === 0 
              ? [cx + n.off[0], cz + TILE/2] 
              : [cx + TILE/2, cz + n.off[1]];
              
            outerWalls.push({
              id: `outer-${c.x}-${c.y}-${n.dx}-${n.dz}`,
              start,
              end,
              isOuter: true
            });
          }
        });
      });

      const walls = [...internalWalls, ...outerWalls];

      let closestWall: any = null;
      let minWallDist = 0.5;

      if (buildTool.startsWith('vector_wall')) {
        // Snap to endpoints
        let minDist = 0.5;
        walls.forEach(w => {
          const d1 = Math.hypot(w.start![0] - target.x, w.start![1] - target.z);
          if (d1 < minDist) { minDist = d1; snapX = w.start![0]; snapZ = w.start![1]; }
          const d2 = Math.hypot(w.end![0] - target.x, w.end![1] - target.z);
          if (d2 < minDist) { minDist = d2; snapX = w.end![0]; snapZ = w.end![1]; }
        });
      } else if (buildTool.includes('door') || buildTool.startsWith('doorway') || buildTool.startsWith('window') || buildTool.startsWith('wall_light')) {
        // Snap to wall segments
        walls.forEach(w => {
          const A = w.start!;
          const B = w.end!;
          const l2 = Math.pow(B[0] - A[0], 2) + Math.pow(B[1] - A[1], 2);
          if (l2 === 0) return;
          let t = ((target.x - A[0]) * (B[0] - A[0]) + (target.z - A[1]) * (B[1] - A[1])) / l2;
          t = Math.max(0, Math.min(1, t));
          const projX = A[0] + t * (B[0] - A[0]);
          const projZ = A[1] + t * (B[1] - A[1]);
          const dist = Math.hypot(target.x - projX, target.z - projZ);
          if (dist < minWallDist) {
            minWallDist = dist;
            snapX = projX;
            snapZ = projZ;
            closestWall = w;
          }
        });
      }

      minWallDistRef.current = minWallDist;
      pointerSnapRef.current = [snapX, snapZ];
      let offsetX = 0;
      let offsetZ = 0;

      if (buildTool.startsWith('vector_wall')) {
        if (wallStartPoint) {
          const dx = snapX - wallStartPoint[0];
          const dz = snapZ - wallStartPoint[1];
          const len = Math.max(Math.hypot(dx, dz), 0.1);
          const cx = (wallStartPoint[0] + snapX) / 2;
          const cz = (wallStartPoint[1] + snapZ) / 2;
          
          const nx = -dz / len;
          const nz = dx / len;
          offsetX = 0;
          offsetZ = 0;
          currentOffsetRef.current = [offsetX, offsetZ];

          ghostRef.current.position.set(cx + offsetX, 1.5, cz + offsetZ);
          ghostRef.current.rotation.y = -Math.atan2(dz, dx);
          ghostRef.current.scale.set(len + 0.2, 1, 1);
        } else {
          ghostRef.current.position.set(snapX, 1.5, snapZ);
          ghostRef.current.rotation.y = 0;
          ghostRef.current.scale.set(0.5, 1, 0.5);
        }
      } else if (closestWall) {
        closestWallRef.current = closestWall.id;
        const dx = closestWall.end![0] - closestWall.start![0];
        const dz = closestWall.end![1] - closestWall.start![1];
        let rot = -Math.atan2(dz, dx);
        
        if (buildTool.includes('door') || buildTool.includes('doorway') || buildTool.startsWith('window') || buildTool.startsWith('wall_light')) {
          const toPlayerX = camera.position.x - snapX;
          const toPlayerZ = camera.position.z - snapZ;
          const nx = -dz;
          const nz = dx;
          if (toPlayerX * nx + toPlayerZ * nz < 0) {
            rot += Math.PI;
          }
        }
        
        ghostRef.current.rotation.y = rot;
        const offX = closestWall.offset ? closestWall.offset[0] : 0;
        const offZ = closestWall.offset ? closestWall.offset[1] : 0;
        
        let surfaceOffX = 0;
        let surfaceOffZ = 0;
        if (buildTool.startsWith('wall_light')) {
          const nx = -(closestWall.end![1] - closestWall.start![1]);
          const nz = (closestWall.end![0] - closestWall.start![0]);
          const len = Math.hypot(nx, nz);
          const normX = nx / len;
          const normZ = nz / len;
          const toPlayerX = camera.position.x - snapX;
          const toPlayerZ = camera.position.z - snapZ;
          const side = (toPlayerX * normX + toPlayerZ * normZ > 0) ? 1 : -1;
          surfaceOffX = normX * side * (T/2 + 0.05);
          surfaceOffZ = normZ * side * (T/2 + 0.05);
        }

        let height = 1.5;
        if (buildTool.startsWith('wall_light')) {
          height = Math.max(0.5, Math.min(2.8, Math.round(target.y * 10) / 10));
        } else if (buildTool.startsWith('window')) {
          height = Math.max(0.6, Math.min(2.0, Math.round(target.y * 2) / 2));
        } else if (buildTool.includes('door') || buildTool.startsWith('doorway')) {
          height = 0;
        }
        
        ghostRef.current.position.set(snapX + offX + surfaceOffX, height, snapZ + offZ + surfaceOffZ);
        currentOffsetRef.current = [offX + surfaceOffX, offZ + surfaceOffZ];
        ghostRef.current.visible = true;
      } else if (buildTool.startsWith('ceiling_light')) {
        const H = layout.wallHeight || 3;
        ghostRef.current.position.set(snapX, H - 0.1, snapZ);
        ghostRef.current.rotation.y = 0;
        ghostRef.current.scale.set(1, 1, 1);
        ghostRef.current.visible = true;
        currentOffsetRef.current = [0, 0];
      } else {
        ghostRef.current.visible = true;
        closestWallRef.current = null;
        ghostRef.current.position.set(snapX, 1.5, snapZ);
        ghostRef.current.rotation.y = ghostRotation;
        ghostRef.current.scale.set(1, 1, 1);
        currentOffsetRef.current = [0, 0];
      }

      // Boundary check: is the center of the ghost inside the floor cells?
      const checkValid = (x: number, z: number) => {
        const check = (cx: number, cz: number) => floorCells.has(`${cx},${cz}`);
        const cx1 = Math.floor(x - 0.01) + 0.5;
        const cx2 = Math.floor(x + 0.01) + 0.5;
        const cz1 = Math.floor(z - 0.01) + 0.5;
        const cz2 = Math.floor(z + 0.01) + 0.5;
        
        // For wall lights, we check the snap point (wall center) rather than the offset point
        const checkX = buildTool.startsWith('wall_light') ? snapX : x;
        const checkZ = buildTool.startsWith('wall_light') ? snapZ : z;
        
        const ccx1 = Math.floor(checkX - 0.01) + 0.5;
        const ccx2 = Math.floor(checkX + 0.01) + 0.5;
        const ccz1 = Math.floor(checkZ - 0.01) + 0.5;
        const ccz2 = Math.floor(checkZ + 0.01) + 0.5;

        return check(ccx1, ccz1) || check(ccx2, ccz1) || check(ccx1, ccz2) || check(ccx2, ccz2);
      };
      
      let isInside = false;
      let canAfford = true;
      if (buildTool.startsWith('vector_wall') && wallStartPoint) {
        isInside = checkValid(snapX, snapZ) && checkValid(wallStartPoint[0], wallStartPoint[1]);
        const dx = snapX - wallStartPoint[0];
        const dz = snapZ - wallStartPoint[1];
        const dist = Math.hypot(dx, dz);
        const parts = buildTool.split('_');
        const matStr = parts[parts.length - 1];
        const cost = Math.ceil(dist * (matStr === 'brick' ? 15 : 10));
        canAfford = useStore.getState().materials[matStr as any] >= cost;
      } else {
        isInside = checkValid(ghostRef.current.position.x, ghostRef.current.position.z);
        
        // Stricter validity for wall-mounted items
        if (buildTool.startsWith('window') || buildTool.startsWith('wall_light') || buildTool.includes('door')) {
          isInside = !!closestWall && minWallDist < 0.2;
        } else if (buildTool.startsWith('ceiling_light')) {
          // Ceiling lights must be inside floor cells
          isInside = checkValid(snapX, snapZ);
        }

        // Spacing check: don't place too close to existing structures of same type on same wall
        if (isInside && closestWall && (buildTool.startsWith('window') || buildTool.startsWith('wall_light'))) {
          const existing = structures.filter(s => 
            s.type === buildTool && 
            s.parentWallId === closestWall.id &&
            Math.hypot(s.position[0] - snapX, s.position[2] - snapZ) < 0.8
          );
          if (existing.length > 0) isInside = false;
        }

        const parts = buildTool.split('_');
        const matStr = parts[parts.length - 1];
        let cost = 10;
        if (buildTool.includes('door')) cost = 15;
        if (buildTool.includes('locked')) cost = 20;
        if (buildTool.startsWith('doorway')) cost = 5;
        canAfford = useStore.getState().materials[matStr as any] >= cost;
      }
      
      ghostRef.current.traverse((child: any) => {
        if (child.isMesh && child.material) {
          child.material.opacity = isInside ? 0.5 : 0.2;
          child.material.color.setHex(isInside && canAfford ? (buildTool.startsWith('locked') ? 0xff0000 : 0x00ff00) : 0xff0000);
        }
      });
    }
  });

  useEffect(() => {
    const doBuild = () => {
      if (!buildMode || !buildTool || !ghostRef.current) return;
      
      const [snapX, snapZ] = pointerSnapRef.current;
      const [offX, offZ] = currentOffsetRef.current;
      const minWallDist = minWallDistRef.current;
      
      const structures = useStore.getState().internalStructures;
      const floorCells = useStore.getState().floorCells;

      const checkValid = (x: number, z: number) => {
        const check = (cx: number, cz: number) => floorCells.has(`${cx},${cz}`);
        const cx1 = Math.floor(x - 0.01) + 0.5;
        const cx2 = Math.floor(x + 0.01) + 0.5;
        const cz1 = Math.floor(z - 0.01) + 0.5;
        const cz2 = Math.floor(z + 0.01) + 0.5;
        
        // For wall lights, we check the snap point (wall center) rather than the offset point
        const checkX = buildTool.startsWith('wall_light') ? snapX : x;
        const checkZ = buildTool.startsWith('wall_light') ? snapZ : z;
        
        const ccx1 = Math.floor(checkX - 0.01) + 0.5;
        const ccx2 = Math.floor(checkX + 0.01) + 0.5;
        const ccz1 = Math.floor(checkZ - 0.01) + 0.5;
        const ccz2 = Math.floor(checkZ + 0.01) + 0.5;

        return check(ccx1, ccz1) || check(ccx2, ccz1) || check(ccx1, ccz2) || check(ccx2, ccz2);
      };

      let isInside = false;
      if (buildTool.startsWith('vector_wall')) {
        isInside = checkValid(snapX, snapZ);
        if (wallStartPoint && !checkValid(wallStartPoint[0], wallStartPoint[1])) isInside = false;
      } else {
        isInside = checkValid(ghostRef.current.position.x, ghostRef.current.position.z);
        
        // Stricter validity for wall-mounted items
        if (buildTool.startsWith('window') || buildTool.startsWith('wall_light') || buildTool.includes('door')) {
          isInside = !!closestWallRef.current && minWallDist < 0.2;
        } else if (buildTool.startsWith('ceiling_light')) {
          isInside = checkValid(snapX, snapZ);
        }

        // Spacing check
        if (isInside && closestWallRef.current && (buildTool.startsWith('window') || buildTool.includes('door') || buildTool.startsWith('wall_light'))) {
          const existing = structures.filter(s => 
            (s.type.startsWith('window') || s.type.includes('door') || s.type.startsWith('wall_light')) && 
            s.parentWallId === closestWallRef.current
          );
          
          for (const s of existing) {
            const dist = Math.hypot(s.position[0] - ghostRef.current!.position.x, s.position[2] - ghostRef.current!.position.z);
            let reqDist = 0.9; // Default for window-window
            if (s.type.includes('door') || buildTool.includes('door')) {
              reqDist = 1.85; // Door needs space to slide (0.5 + 0.9 + 0.45 = 1.85)
            }
            
            if (dist < reqDist) {
              isInside = false;
              break;
            }
          }
        }
      }

      if (!isInside) return;

      const parts = buildTool.split('_');
      const typeStr = parts[0];
      const matStr = parts[parts.length - 1];
      
      if (buildTool.startsWith('vector_wall')) {
        if (!wallStartPoint) {
          setWallStartPoint([snapX, snapZ]);
        } else {
          const dx = snapX - wallStartPoint[0];
          const dz = snapZ - wallStartPoint[1];
          const dist = Math.hypot(dx, dz);
          
          if (dist > 0.1) {
            const cost = Math.ceil(dist * (matStr === 'brick' ? 15 : 10));
            if (useStore.getState().materials[matStr as any] >= cost) {
              addInternalStructure({
                id: `struct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'vector_wall',
                material: matStr as any,
                position: [0, 0, 0],
                rotation: 0,
                start: wallStartPoint,
                end: [snapX, snapZ],
                offset: [offX, offZ]
              }, cost);
              setWallStartPoint([snapX, snapZ]); // Start next wall from here
            } else {
              // Not enough materials, do nothing so they can make it shorter
              return;
            }
          } else {
            setWallStartPoint(null);
          }
        }
      } else {
        let type: any = 'partition';
        if (buildTool.includes('locked_door')) type = 'locked_door';
        else if (buildTool.includes('doorway')) type = 'doorway';
        else if (buildTool.includes('door')) type = 'door';
        else if (buildTool.startsWith('window')) type = 'window';
        else if (buildTool.startsWith('wall_light')) type = 'wall_light';
        else if (buildTool.startsWith('ceiling_light')) type = 'ceiling_light';

        let cost = 10;
        if (type === 'door') cost = 15;
        if (type === 'locked_door') cost = 20;
        if (type === 'doorway') cost = 5;
        if (type === 'window') cost = 20;
        if (type === 'ceiling_light') cost = 12;

        if (ghostRef.current && ghostRef.current.visible && useStore.getState().materials[matStr as any] >= cost) {
          const isOuter = !!closestWallRef.current?.startsWith('outer-');
          addInternalStructure({
            id: `struct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            material: matStr as any,
            position: [ghostRef.current.position.x, ghostRef.current.position.y, ghostRef.current.position.z],
            rotation: ghostRef.current.rotation.y,
            parentWallId: closestWallRef.current || undefined,
            isOuter: isOuter
          }, cost);
        }
      }
    };

    const handleEvent = () => doBuild();
    const handleClick = (e: MouseEvent) => {
      if (document.pointerLockElement && buildMode && buildTool) {
        if (e.button === 2) {
          setWallStartPoint(null);
          return;
        }
        if (e.button === 0) doBuild();
      }
    };

    window.addEventListener('build-action', handleEvent);
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('build-action', handleEvent);
      window.removeEventListener('mousedown', handleClick);
    };
  }, [buildMode, buildTool, ghostRotation, wallStartPoint, addInternalStructure, setWallStartPoint]);

  if (!buildMode || !buildTool) return null;

  const isVector = buildTool.startsWith('vector_wall');
  const isPartition = buildTool.startsWith('partition');
  const isDoor = buildTool.includes('door') || buildTool.startsWith('doorway');
  const isWindow = buildTool.startsWith('window');
  const isWallLight = buildTool.startsWith('wall_light');
  const isCeilingLight = buildTool.startsWith('ceiling_light');

  const DOOR_W = 0.9;
  const DOOR_H = 2.1;

  return (
    <group ref={ghostRef}>
      {(isPartition || isVector) && (
        <mesh>
          <boxGeometry args={[1, 3, 0.2]} />
          <meshStandardMaterial color="#00ff00" transparent opacity={0.5} />
        </mesh>
      )}
      {isDoor && (
        <group>
          {/* Door frame ghost */}
          <mesh position={[-DOOR_W/2, DOOR_H/2, 0]}>
            <boxGeometry args={[0.1, DOOR_H, 0.2]} />
            <meshStandardMaterial color="#00aaff" transparent opacity={0.5} />
          </mesh>
          <mesh position={[DOOR_W/2, DOOR_H/2, 0]}>
            <boxGeometry args={[0.1, DOOR_H, 0.2]} />
            <meshStandardMaterial color="#00aaff" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0, DOOR_H, 0]}>
            <boxGeometry args={[DOOR_W + 0.1, 0.1, 0.2]} />
            <meshStandardMaterial color="#00aaff" transparent opacity={0.5} />
          </mesh>
          {/* Door panel ghost */}
          {!buildTool.startsWith('doorway') && (
            <mesh position={[0, DOOR_H/2, 0]}>
              <boxGeometry args={[DOOR_W, DOOR_H, 0.05]} />
              <meshStandardMaterial color={buildTool.startsWith('locked') ? "#ff0000" : "#00aaff"} transparent opacity={0.3} />
            </mesh>
          )}
        </group>
      )}
      {isWindow && (
        <group>
          <mesh>
            <boxGeometry args={[0.8, 1.2, 0.22]} />
            <meshStandardMaterial color="#88ccff" transparent opacity={0.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.9, 1.3, 0.2]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
          </mesh>
        </group>
      )}
      {isWallLight && (
        <group>
          <mesh>
            <boxGeometry args={[0.3, 0.2, 0.15]} />
            <meshStandardMaterial color="#ffff00" transparent opacity={0.8} />
          </mesh>
          <pointLight intensity={1} distance={5} color="#ffff00" />
        </group>
      )}
      {isCeilingLight && (
        <group>
          <mesh>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
            <meshStandardMaterial color="#ffff00" transparent opacity={0.8} />
          </mesh>
          <pointLight intensity={1} distance={5} color="#ffff00" />
        </group>
      )}
    </group>
  );
}
