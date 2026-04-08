import { RigidBody } from '@react-three/rapier';

export function Nail() {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[0, 2, -9.9]}>
      <group userData={{ interactable: true, id: 'nail' }}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      </group>
    </RigidBody>
  );
}
