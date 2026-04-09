import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

const TREE_COUNT = 40;
const BUSH_COUNT = 60;

export function Landscape() {
  const treeTrunkRef = useRef<THREE.InstancedMesh>(null);
  const treeLeavesRef = useRef<THREE.InstancedMesh>(null);
  const bushRef = useRef<THREE.InstancedMesh>(null);

  const { trees, bushes } = useMemo(() => {
    const t = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const size = 0.5 + Math.random() * 1.5;
      t.push({ x, z, size });
    }

    const b = [];
    for (let i = 0; i < BUSH_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 40;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const size = 0.3 + Math.random() * 0.6;
      b.push({ x, z, size });
    }
    return { trees: t, bushes: b };
  }, []);

  useEffect(() => {
    if (!treeTrunkRef.current || !treeLeavesRef.current || !bushRef.current) return;

    const dummy = new THREE.Object3D();

    trees.forEach((t, i) => {
      // Trunk
      dummy.position.set(t.x, 1 * t.size, t.z);
      dummy.scale.set(t.size, t.size, t.size);
      dummy.updateMatrix();
      treeTrunkRef.current!.setMatrixAt(i, dummy.matrix);

      // Leaves
      dummy.position.set(t.x, 2.5 * t.size, t.z);
      dummy.updateMatrix();
      treeLeavesRef.current!.setMatrixAt(i, dummy.matrix);
    });

    bushes.forEach((b, i) => {
      dummy.position.set(b.x, b.size / 2, b.z);
      dummy.scale.set(b.size, b.size, b.size);
      dummy.updateMatrix();
      bushRef.current!.setMatrixAt(i, dummy.matrix);
    });

    treeTrunkRef.current.instanceMatrix.needsUpdate = true;
    treeLeavesRef.current.instanceMatrix.needsUpdate = true;
    bushRef.current.instanceMatrix.needsUpdate = true;
  }, [trees, bushes]);

  return (
    <group>
      <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#3a5f0b" roughness={1} />
      </mesh>
      
      <instancedMesh ref={treeTrunkRef} args={[undefined, undefined, TREE_COUNT]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 2]} />
        <meshStandardMaterial color="#4a3018" />
      </instancedMesh>

      <instancedMesh ref={treeLeavesRef} args={[undefined, undefined, TREE_COUNT]} castShadow>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial color="#2d4c1e" />
      </instancedMesh>

      <instancedMesh ref={bushRef} args={[undefined, undefined, BUSH_COUNT]} castShadow>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#4a7023" />
      </instancedMesh>
    </group>
  );
}
