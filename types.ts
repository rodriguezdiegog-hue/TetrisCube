
export enum TetrominoType {
  I = 'I',
  J = 'J',
  L = 'L',
  O = 'O',
  S = 'S',
  T = 'T',
  Z = 'Z',
  STONE = 'STONE', // Petrified lines
  PENDING = 'PENDING', // Lines waiting for minigame activation
}

export interface Tetromino {
  shape: number[][];
  color: string;
  type: TetrominoType;
}

export type GridCell = { type: TetrominoType; color: string } | null;
export type Grid = GridCell[][];

export interface Player {
  name: string;
  score: number; // Actual Points
  level: number; // Max Level reached
  time: string; // Formatted string
  timeSeconds: number; // Raw seconds for sorting
  date: number;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LINE_CLEAR = 'LINE_CLEAR', // New state: Pauses game to flash completed lines before minigame
  MINIGAME = 'MINIGAME', // The Simon Says part
  ANIMATING = 'ANIMATING', // New state for showing explosions/petrification
  GAMEOVER = 'GAMEOVER',
  VICTORY = 'VICTORY',
}

export interface ButtonConfig {
  id: number;
  color: string;
  label?: string;
  position: string; // Tailwind classes for grid placement
}