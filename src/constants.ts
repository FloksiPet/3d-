export interface Cell {
  x: number;
  y: number;
  type: number; // 1 = floor, 2 = door
}

export interface BuildingLayout {
  cells: Cell[];
  minX: number;
  minY: number;
  wallHeight: number;
  grid?: number[][];
}

export const DEFAULT: BuildingLayout = {
  cells: [
    {x: 0, y: 0, type: 1}, {x: 1, y: 0, type: 1}, {x: 2, y: 0, type: 1},
    {x: 0, y: 1, type: 1}, {x: 1, y: 1, type: 1}, {x: 2, y: 1, type: 1},
    {x: 0, y: 2, type: 1}, {x: 1, y: 2, type: 2}, {x: 2, y: 2, type: 1},
  ],
  minX: 0,
  minY: 0,
  wallHeight: 3,
};

export const TILE = 1;
export const T = 0.2; // 20cm thickness
export const DOOR_W = 0.9;
export const DOOR_H = 2.1;
export const SHOW_GRID = true;
