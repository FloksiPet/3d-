import { useFrame, useThree, useLoader } from '@react-three/fiber';
import { useRef, Suspense } from 'react';
import { OBJLoader } from 'three-stdlib';
import { useStore } from '../store';

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj.clone()} />;
}

export function HeldItemView() {
  const heldItem = useStore(s => s.heldItem);
  const ref = useRef<any>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(camera.position);
      ref.current.quaternion.copy(camera.quaternion);
      ref.current.translateX(0.5);
      ref.current.translateY(-0.5);
      ref.current.translateZ(-1);
    }
  });

  if (!heldItem) return null;

  return (
    <group ref={ref}>
      {heldItem.type === 'painting' && (
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <boxGeometry args={[0.6, 0.025, 0.4]} />
          <meshStandardMaterial color="#fff" />
          <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.55, 0.35]} />
            <meshStandardMaterial color="teal" />
          </mesh>
        </mesh>
      )}
      {heldItem.type === 'box' && (
        <mesh>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshStandardMaterial color={heldItem.name.includes('Red') ? 'red' : 'blue'} />
        </mesh>
      )}
      {heldItem.type === 'obj' && heldItem.url && (
        <Suspense fallback={<mesh><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color="gray" /></mesh>}>
          <group scale={0.5}>
            <ObjModel url={heldItem.url} />
          </group>
        </Suspense>
      )}
    </group>
  );
}
