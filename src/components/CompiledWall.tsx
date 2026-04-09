import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RigidBody } from '@react-three/rapier';
import { DOOR_W, DOOR_H } from '../constants';

export function CompiledWall({ struct, allStructures, H, T }: any) {
  const geometry = useMemo(() => {
    const dx = struct.end[0] - struct.start[0];
    const dz = struct.end[1] - struct.start[1];
    const len = Math.max(Math.hypot(dx, dz), 0.1);

    const shape = new THREE.Shape();
    // Extend by T/2 + 0.1 to ensure perfect overlap at corners and prevent light leaks
    const ext = T / 2 + 0.1;
    // Extend vertically to cut through floor and ceiling
    const vExt = 0.5;
    
    shape.moveTo(-ext, -vExt);
    shape.lineTo(len + ext, -vExt);
    shape.lineTo(len + ext, H + vExt);
    shape.lineTo(-ext, H + vExt);
    shape.lineTo(-ext, -vExt);

    const openings = allStructures.filter((s: any) => s.parentWallId === struct.id && (s.type === 'door' || s.type === 'locked_door' || s.type === 'doorway'));
    openings.forEach((op: any) => {
      const w = DOOR_W;
      let h = DOOR_H;
      let y = 0;

      // Doors cut all the way down through the floor
      h += vExt;
      y = -vExt;

      // Calculate distance along wall
      const vx = op.position[0] - (struct.offset?.[0] || 0) - struct.start[0];
      const vz = op.position[2] - (struct.offset?.[1] || 0) - struct.start[1];
      const dirX = dx / len;
      const dirZ = dz / len;
      const d = vx * dirX + vz * dirZ;

      const hole = new THREE.Path();
      hole.moveTo(d - w/2, y);
      hole.lineTo(d + w/2, y);
      hole.lineTo(d + w/2, y + h);
      hole.lineTo(d - w/2, y + h);
      hole.lineTo(d - w/2, y);
      shape.holes.push(hole);
    });

    const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
    // ExtrudeGeometry extrudes along +Z. Center it on the wall line.
    geo.translate(0, 0, -T/2);
    return geo;
  }, [struct, allStructures, H, T]);

  const cx = struct.start[0] + (struct.offset?.[0] || 0);
  const cz = struct.start[1] + (struct.offset?.[1] || 0);
  const rotY = -Math.atan2(struct.end[1] - struct.start[1], struct.end[0] - struct.start[0]);

  const color = struct.material === 'wood' ? '#8B5A2B' : struct.material === 'brick' ? '#B22222' : '#c8b89a';

  return (
    <RigidBody type="fixed" colliders="trimesh" position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </RigidBody>
  );
}
