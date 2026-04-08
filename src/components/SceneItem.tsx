import { RigidBody, CuboidCollider, CylinderCollider, useSpringJoint } from '@react-three/rapier';
import React, { useEffect, useRef, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { OBJLoader } from 'three-stdlib';
import { SceneItemType } from '../store';

function ObjModel({ url, scale = [1, 1, 1] }: { url: string, scale?: [number, number, number] }) {
  const obj = useLoader(OBJLoader, url);
  
  const clonedObj = React.useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj]);

  return <primitive object={clonedObj} scale={scale} />;
}

function SpringStickItem({ id, position, rotation, velocity, angularVelocity, isFixed }: any) {
  const ref1 = useRef<any>(null);
  const ref2 = useRef<any>(null);

  // З'єднуємо дві частини палиці пружинним шарніром
  useSpringJoint(ref1, ref2, [
    [0, 0.4, 0],  // Точка кріплення на першій частині
    [0, -0.4, 0], // Точка кріплення на другій частині
    0.1,          // Довжина пружини у спокої
    200,          // Жорсткість (stiffness)
    10            // Загасання (damping)
  ]);

  useEffect(() => {
    if (!isFixed) {
      if (velocity) {
        ref1.current?.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        ref2.current?.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
      }
      if (angularVelocity) {
        ref1.current?.setAngvel({ x: angularVelocity[0], y: angularVelocity[1], z: angularVelocity[2] }, true);
        ref2.current?.setAngvel({ x: angularVelocity[0], y: angularVelocity[1], z: angularVelocity[2] }, true);
      }
    }
  }, [velocity, angularVelocity, isFixed]);

  return (
    <group position={position} rotation={rotation} userData={{ interactable: true, id }}>
      <RigidBody ref={ref1} colliders={false} position={[0, -0.45, 0]} type={isFixed ? "fixed" : "dynamic"}>
        <CylinderCollider args={[0.45, 0.05]} />
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.9]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>
      <RigidBody ref={ref2} colliders={false} position={[0, 0.45, 0]} type={isFixed ? "fixed" : "dynamic"}>
        <CylinderCollider args={[0.45, 0.05]} />
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.9]} />
          <meshStandardMaterial color="lightgreen" />
        </mesh>
      </RigidBody>
    </group>
  );
}

export function SceneItem({ id, item, position, rotation, velocity, angularVelocity, isFixed }: SceneItemType & { key?: React.Key }) {
  const ref = useRef<any>(null);
  
  if (item.type === 'spring_stick') {
    return <SpringStickItem id={id} position={position} rotation={rotation} velocity={velocity} angularVelocity={angularVelocity} isFixed={isFixed} />;
  }

  useEffect(() => {
    if (ref.current && !isFixed) {
      if (velocity) ref.current.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
      if (angularVelocity) ref.current.setAngvel({ x: angularVelocity[0], y: angularVelocity[1], z: angularVelocity[2] }, true);
    }
  }, [velocity, angularVelocity, isFixed]);

  return (
    <RigidBody 
      ref={ref} 
      type={isFixed ? "fixed" : "dynamic"} 
      colliders={item.type === 'obj' ? "cuboid" : false} 
      position={position} 
      rotation={rotation}
      ccd={true}
      restitution={item.type === 'rubber_box' ? 1.2 : 0.2} // Гумовий бокс має високу пружність (відскакує)
      linearDamping={item.type === 'painting' ? 0.5 : 0}
      angularDamping={item.type === 'painting' ? 0.5 : 0}
    >
      {/* Explicit colliders for basic shapes to set custom mass */}
      {item.type === 'painting' && <CuboidCollider args={[0.6, 0.025, 0.4]} mass={item.mass || 0.5} />}
      {item.type === 'box' && <CuboidCollider args={[0.25, 0.25, 0.25]} mass={item.mass || 1} />}
      {item.type === 'rubber_box' && <CuboidCollider args={[0.4, 0.2, 0.4]} mass={item.mass || 1} />}

      <group userData={{ interactable: true, id }}>
        {item.type === 'painting' && (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.05, 0.8]} />
            <meshStandardMaterial color="#fff" />
            <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1.1, 0.7]} />
              <meshStandardMaterial color="teal" />
            </mesh>
          </mesh>
        )}
        {item.type === 'box' && (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={item.name.includes('Red') ? 'red' : 'blue'} />
          </mesh>
        )}
        {item.type === 'rubber_box' && (
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.4, 0.8]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
        )}
        {item.type === 'obj' && item.url && (
          <Suspense fallback={<mesh castShadow receiveShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="gray" /></mesh>}>
            <ObjModel url={item.url} scale={item.scale} />
          </Suspense>
        )}
      </group>
    </RigidBody>
  );
}
