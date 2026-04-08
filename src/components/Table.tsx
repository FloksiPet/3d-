import { RigidBody } from '@react-three/rapier';

export function Table() {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={[0, 0, -5]}>
      {/* Table Top */}
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[3, 0.1, 2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Legs */}
      <mesh position={[-1.4, 0.5, -0.9]}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <mesh position={[1.4, 0.5, -0.9]}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <mesh position={[-1.4, 0.5, 0.9]}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
      <mesh position={[1.4, 0.5, 0.9]}><boxGeometry args={[0.1, 1, 0.1]} /><meshStandardMaterial color="#8B4513" /></mesh>
    </RigidBody>
  );
}
