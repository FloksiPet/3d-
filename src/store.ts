import { create } from 'zustand';
import { DEFAULT } from './constants';
import type { BuildingLayout } from './constants';

export type PlayerRole = 'owner' | 'trusted' | 'guest';

export type Item = {
  id: string;
  name: string;
  type: 'painting' | 'obj' | 'box' | 'rubber_box' | 'spring_stick';
  url?: string;
  scale?: [number, number, number];
  mass?: number;
};

type Keys = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
  jump: boolean;
};

export type SceneItemType = {
  id: string;
  item: Item;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity?: [number, number, number];
  angularVelocity?: [number, number, number];
  isFixed?: boolean;
};

export type InternalStructure = {
  id: string;
  type: 'partition' | 'door' | 'locked_door' | 'sliding_door' | 'locked_sliding_door' | 'doorway' | 'vector_wall' | 'window' | 'wall_light' | 'ceiling_light';
  material: 'wood' | 'brick' | 'blocks' | 'glass' | 'metal';
  position: [number, number, number];
  rotation: number;
  start?: [number, number];
  end?: [number, number];
  offset?: [number, number];
  parentWallId?: string;
  isOuter?: boolean;
};

type State = {
  inventory: Item[];
  inventoryOpen: boolean;
  builderOpen: boolean;
  buildMode: boolean;
  buildTool: string | null;
  buildMenuOpen: boolean;
  ghostRotation: number;
  wallStartPoint: [number, number] | null;
  floorCells: Set<string>;
  internalStructures: InternalStructure[];
  materials: Record<string, number>;
  heldItem: Item | null;
  hoveredId: string | null;
  hoveredType: string | null;
  sceneItems: SceneItemType[];
  keys: Keys;
  joystick: { x: number; y: number };
  lookDelta: { x: number; y: number };
  spawn: { pos: [number, number, number]; rotY: number };
  layout: BuildingLayout;
  
  gameTime: number; // Minutes from midnight
  sunOffset: number; // Manual offset for offline mode
  setGameTime: (t: number) => void;
  setSunOffset: (o: number) => void;
  updateGameTime: (delta: number) => void;

  setKey: (key: keyof Keys, value: boolean) => void;
  setJoystick: (j: { x: number; y: number }) => void;
  setLookDelta: (l: { x: number; y: number }) => void;
  setSpawn: (s: { pos: [number, number, number]; rotY: number }) => void;
  setLayout: (l: BuildingLayout) => void;
  toggleInventory: () => void;
  setInventoryOpen: (open: boolean) => void;
  setBuilderOpen: (open: boolean) => void;
  setBuildMode: (mode: boolean) => void;
  setBuildTool: (tool: string | null) => void;
  setBuildMenuOpen: (open: boolean) => void;
  setGhostRotation: (rot: number | ((prev: number) => number)) => void;
  setWallStartPoint: (pt: [number, number] | null) => void;
  setFloorCells: (cells: Set<string>) => void;
  addInternalStructure: (struct: InternalStructure, customCost?: number) => void;
  addToInventory: (item: Item) => void;
  equipItem: (item: Item) => void;
  dropItem: (position: [number, number, number], direction: [number, number, number], isFixed?: boolean, rotation?: [number, number, number], angularVelocity?: [number, number, number]) => void;
  setHoveredId: (id: string | null) => void;
  setHoveredType: (type: string | null) => void;
  pickUpItem: (id: string) => void;

  playerRole: PlayerRole;
  setPlayerRole: (role: PlayerRole) => void;
  pinPadOpen: string | null;
  setPinPadOpen: (id: string | null) => void;
  doorStates: Record<string, boolean>;
  toggleDoor: (id: string, forceState?: boolean) => void;
  closeAllDoors: () => void;
  resetDefaultDoors: () => void;
  doorConfigs: Record<string, any>;
  setDoorConfigs: (configs: Record<string, any>) => void;
  updateDoorConfig: (id: string, config: any) => void;
};

export const useStore = create<State>((set) => ({
  // Це імітація "папки на сервері". 
  inventory: [
    { id: 'inv-1', name: 'Light Red Box', type: 'box', mass: 0.5 },
    { id: 'inv-2', name: 'Heavy Blue Box', type: 'box', mass: 50 },
    { id: 'inv-3', name: 'Rubber Box', type: 'rubber_box', mass: 1 },
    { id: 'inv-4', name: 'Flexible Stick', type: 'spring_stick', mass: 2 }
  ],
  inventoryOpen: false,
  builderOpen: false,
  buildMode: false,
  buildTool: null,
  buildMenuOpen: true,
  ghostRotation: 0,
  wallStartPoint: null,
  floorCells: new Set(),
  internalStructures: [],
  materials: {
    wood: 150,
    brick: 300,
    blocks: 50,
    glass: 100,
    metal: 100
  },
  heldItem: null,
  hoveredId: null,
  hoveredType: null,
  sceneItems: [],
  keys: { forward: false, backward: false, left: false, right: false, interact: false, jump: false },
  joystick: { x: 0, y: 0 },
  lookDelta: { x: 0, y: 0 },
  spawn: { pos: [1.5, 1, 1.5], rotY: 0 },
  layout: DEFAULT,

  gameTime: 0,
  sunOffset: 0,
  setGameTime: (t) => set({ gameTime: t }),
  setSunOffset: (o) => set({ sunOffset: o }),
  updateGameTime: (delta) => set((state) => ({ gameTime: (state.gameTime + delta) % 1440 })),

  playerRole: 'owner',
  pinPadOpen: null,
  doorStates: {},
  doorConfigs: {},

  setPlayerRole: (role) => set({ playerRole: role }),
  setPinPadOpen: (id) => set({ pinPadOpen: id }),
  toggleDoor: (id, forceState) => set((state) => ({
    doorStates: { ...state.doorStates, [id]: forceState !== undefined ? forceState : !state.doorStates[id] }
  })),
  closeAllDoors: () => set({ doorStates: {} }),
  resetDefaultDoors: () => set((state) => {
    const newStates = { ...state.doorStates };
    // Close all exterior doors
    Object.keys(state.doorConfigs).forEach(id => {
      newStates[id] = false; // close
    });
    // Close all internal doors
    state.internalStructures.forEach(struct => {
      if (struct.type === 'door' || struct.type === 'locked_door') {
        newStates[struct.id] = false; // close
      }
    });
    return { doorStates: newStates };
  }),
  setDoorConfigs: (configs) => set({ doorConfigs: configs }),
  updateDoorConfig: (id, config) => set((state) => ({
    doorConfigs: { ...state.doorConfigs, [id]: { ...state.doorConfigs[id], ...config } }
  })),

  setKey: (key, value) => set((state) => ({ keys: { ...state.keys, [key]: value } })),
  setJoystick: (j) => set({ joystick: j }),
  setLookDelta: (l) => set({ lookDelta: l }),
  setSpawn: (s) => set({ spawn: s }),
  setLayout: (l) => set({ layout: l }),
  toggleInventory: () => set((state) => ({ inventoryOpen: !state.inventoryOpen })),
  setInventoryOpen: (open) => set({ inventoryOpen: open }),
  setBuilderOpen: (open) => set({ builderOpen: open }),
  setBuildMode: (mode) => set({ buildMode: mode, buildTool: null, buildMenuOpen: true }),
  setBuildTool: (tool) => set({ buildTool: tool }),
  setBuildMenuOpen: (open) => set({ buildMenuOpen: open }),
  setGhostRotation: (rot) => set((state) => ({ ghostRotation: typeof rot === 'function' ? rot(state.ghostRotation) : rot })),
  setWallStartPoint: (pt) => set({ wallStartPoint: pt }),
  setFloorCells: (cells) => set({ floorCells: cells }),
  addInternalStructure: (struct, customCost) => set((state) => {
    let cost = customCost ?? 10;
    if (!customCost) {
      if (struct.type.includes('door')) cost = 15;
      if (struct.type.includes('locked')) cost = 20;
      if (struct.type === 'doorway') cost = 5;
    }

    if (state.materials[struct.material] >= cost) {
      const newConfigs = { ...state.doorConfigs };
      if (struct.type.includes('locked')) {
        newConfigs[struct.id] = { pin: '', trustedNeedsPin: true };
      }
      return {
        internalStructures: [...state.internalStructures, struct],
        materials: { ...state.materials, [struct.material]: state.materials[struct.material] - cost },
        doorConfigs: newConfigs
      };
    }
    return state; // Not enough materials
  }),
  addToInventory: (item) => set((state) => ({ inventory: [...state.inventory, item] })),
  equipItem: (item) => set({ heldItem: item, inventoryOpen: false }),
  dropItem: (position, direction, isFixed = false, rotation = [0, 0, 0], angularVelocity = [0, 0, 0]) => set((state) => {
    if (!state.heldItem) return state;
    const newItem: SceneItemType = {
      id: `scene-${Date.now()}`,
      item: state.heldItem,
      position: [position[0], position[1], position[2]],
      rotation: [rotation[0], rotation[1], rotation[2]],
      velocity: [direction[0], direction[1], direction[2]],
      angularVelocity: [angularVelocity[0], angularVelocity[1], angularVelocity[2]],
      isFixed
    };
    return {
      heldItem: null,
      sceneItems: [...state.sceneItems, newItem]
    };
  }),
  setHoveredId: (id) => set({ hoveredId: id }),
  setHoveredType: (type) => set({ hoveredType: type }),
  pickUpItem: (id) => set((state) => {
    const sceneItem = state.sceneItems.find(si => si.id === id);
    if (sceneItem) {
      return {
        sceneItems: state.sceneItems.filter(si => si.id !== id),
        heldItem: sceneItem.item
      };
    }
    return state;
  })
}));
