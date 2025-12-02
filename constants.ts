import { Tetromino, TetrominoType, ButtonConfig } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const MAX_LEVEL = 10;

export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  [TetrominoType.I]: {
    shape: [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    color: 'cyan-400',
    type: TetrominoType.I,
  },
  [TetrominoType.J]: {
    shape: [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
    color: 'blue-500',
    type: TetrominoType.J,
  },
  [TetrominoType.L]: {
    shape: [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    color: 'orange-500',
    type: TetrominoType.L,
  },
  [TetrominoType.O]: {
    shape: [[1, 1], [1, 1]],
    color: 'yellow-400',
    type: TetrominoType.O,
  },
  [TetrominoType.S]: {
    shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    color: 'green-500',
    type: TetrominoType.S,
  },
  [TetrominoType.T]: {
    shape: [[1, 1, 1], [0, 1, 0], [0, 0, 0]],
    color: 'purple-500',
    type: TetrominoType.T,
  },
  [TetrominoType.Z]: {
    shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    color: 'red-500',
    type: TetrominoType.Z,
  },
  [TetrominoType.STONE]: {
    shape: [[1]],
    color: 'gray-500',
    type: TetrominoType.STONE,
  },
  [TetrominoType.PENDING]: {
    shape: [[1]],
    color: 'yellow-400',
    type: TetrominoType.PENDING,
  },
};

export const CUBE_BUTTONS: ButtonConfig[] = [
  { id: 0, color: 'bg-green-500', position: 'col-start-2 row-start-1' }, // Top
  { id: 1, color: 'bg-red-500', position: 'col-start-1 row-start-2' }, // Left
  { id: 2, color: 'bg-yellow-400', position: 'col-start-2 row-start-2' }, // Center
  { id: 3, color: 'bg-blue-500', position: 'col-start-3 row-start-2' }, // Right
  { id: 4, color: 'bg-purple-500', position: 'col-start-2 row-start-3' }, // Bottom
];