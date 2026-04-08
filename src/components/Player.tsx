import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useStore } from '../store';

const SPEED = 5;
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

export function Player() {
  const ref = useRef<any>(null);
  const { camera, scene } = useThree();
  const rapier = useRapier();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  
  const spawn = useStore(s => s.spawn);
  const forward = useStore(s => s.keys.forward);
  const backward = useStore(s => s.keys.backward);
  const left = useStore(s => s.keys.left);
  const right = useStore(s => s.keys.right);
  const interact = useStore(s => s.keys.interact);
  const jump = useStore(s => s.keys.jump);
  const joystick = useStore(s => s.joystick);
  const lookDelta = useStore(s => s.lookDelta);
  const setLookDelta = useStore(s => s.setLookDelta);
  const setHoveredId = useStore(s => s.setHoveredId);
  const setHoveredType = useStore(s => s.setHoveredType);
  const hoveredId = useStore(s => s.hoveredId);
  const hoveredType = useStore(s => s.hoveredType);
  const pickUpItem = useStore(s => s.pickUpItem);
  const dropItem = useStore(s => s.dropItem);
  const heldItem = useStore(s => s.heldItem);
  const setKey = useStore(s => s.setKey);
  const inventoryOpen = useStore(s => s.inventoryOpen);
  const builderOpen = useStore(s => s.builderOpen);
  const buildMode = useStore(s => s.buildMode);

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    euler.set(0, spawn.rotY, 0);
    camera.quaternion.setFromEuler(euler);
    
    // Телепортуємо фізичне тіло в нову точку появи
    if (ref.current) {
      ref.current.setTranslation({ x: spawn.pos[0], y: spawn.pos[1], z: spawn.pos[2] }, true);
      ref.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      ref.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [spawn, camera]);

  useFrame(() => {
    if (!ref.current) return;

    // Look (Mobile)
    if (isTouch && !inventoryOpen && !builderOpen && (lookDelta.x !== 0 || lookDelta.y !== 0)) {
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= lookDelta.x * 0.005;
      euler.x -= lookDelta.y * 0.005;
      euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
      camera.quaternion.setFromEuler(euler);
      setLookDelta({ x: 0, y: 0 });
    }

    // Movement
    const velocity = ref.current.linvel();
    let newVelocityY = velocity.y;
    
    // Simple ground check
    const isOnGround = Math.abs(velocity.y) < 0.1;
    if (jump && isOnGround && !buildMode && !inventoryOpen && !builderOpen) {
      newVelocityY = 5; // Jump strength
    }
    
    const fwd = (inventoryOpen || builderOpen) ? 0 : (forward ? 1 : 0) - (backward ? 1 : 0) + joystick.y;
    const rgt = (inventoryOpen || builderOpen) ? 0 : (right ? 1 : 0) - (left ? 1 : 0) + joystick.x;

    direction.set(rgt, 0, -fwd);
    direction.applyQuaternion(camera.quaternion);
    direction.y = 0;
    
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(SPEED);
    }

    ref.current.setLinvel({ x: direction.x, y: newVelocityY, z: direction.z }, true);

    // Camera position
    const pos = ref.current ? ref.current.translation() : { x: spawn.pos[0], y: spawn.pos[1], z: spawn.pos[2] };
    camera.position.set(pos.x, pos.y + 0.7, pos.z); // Рівень очей ~1.6м (0.9м центр + 0.7м)

    // Raycast for interaction
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    let hitId = null;
    let hitType = null;
    for (const hit of intersects) {
      if (hit.distance > 3) break;
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.interactable) {
          hitId = obj.userData.id;
          hitType = obj.userData.type;
          break;
        }
        obj = obj.parent;
      }
      if (hitId || hitType === 'door' || hitType === 'exit_door' || hitType === 'interior_door' || hitType === 'keypad') break;
    }

    if (hitId !== hoveredId) setHoveredId(hitId);
    if (hitType !== hoveredType) setHoveredType(hitType);
  });

  // Handle interaction key
  useEffect(() => {
    if (interact && !inventoryOpen && !builderOpen && !buildMode) {
      if (hoveredType === 'keypad' || hoveredType === 'locked_door') {
        const hitId = hoveredId;
        if (!hitId) return;
        const config = useStore.getState().doorConfigs[hitId] || { pin: '', trustedNeedsPin: true };
        const role = useStore.getState().playerRole;
        const isOpen = useStore.getState().doorStates[hitId];
        
        if (isOpen) {
          useStore.getState().toggleDoor(hitId);
          return;
        }
        
        if (hoveredType === 'keypad' && role === 'owner') {
          useStore.getState().setPinPadOpen(hitId);
        } else if (role === 'owner' || (role === 'trusted' && !config.trustedNeedsPin)) {
          useStore.getState().toggleDoor(hitId);
        } else {
          useStore.getState().setPinPadOpen(hitId);
        }
      } else if (hoveredType === 'door' || hoveredType === 'exit_door' || hoveredType === 'interior_door') {
        const hitId = hoveredId;
        if (!hitId) return;
        useStore.getState().toggleDoor(hitId);
      } else if (heldItem) {
        if (hoveredId === 'nail' && heldItem.type === 'painting') {
          // Hang the painting on the nail
          dropItem([0, 2, -9.85], [0, 0, 0], true, [Math.PI / 2, 0, 0]);
        } else {
          const dropPos = new THREE.Vector3().copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
          
          // Розраховуємо швидкість кидка залежно від маси (F = m * a)
          // Якщо ми прикладаємо однакову силу (наприклад, 5), то легкий предмет полетить швидко, а важкий - повільно.
          const mass = heldItem.mass || 1;
          const throwForce = 5;
          const speed = throwForce / mass;
          
          const dropDir = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(speed);
          
          // Add random spin (tumbling)
          const spin: [number, number, number] = [
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
          ];
          
          dropItem(dropPos.toArray(), dropDir.toArray(), false, [0, 0, 0], spin);
        }
      } else if (hoveredId && hoveredType !== 'door') {
        pickUpItem(hoveredId);
      }
      // Reset interact key to prevent multiple triggers
      setKey('interact', false);
    }
  }, [interact, heldItem, hoveredId, hoveredType, camera, dropItem, pickUpItem, setKey, inventoryOpen, builderOpen, buildMode]);

  return (
    <>
      {!isTouch && !inventoryOpen && !builderOpen && <PointerLockControls />}
      <RigidBody ref={ref} colliders={false} mass={1} type="dynamic" position={spawn.pos} enabledRotations={[false, false, false]} ccd>
        <CapsuleCollider args={[0.6, 0.2]} />
      </RigidBody>
    </>
  );
}
