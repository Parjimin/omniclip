import { HitboxRect } from "./types";

export const INTERNAL_WIDTH = 1280;
export const INTERNAL_HEIGHT = 320;
export const SPRITE_SIZE = 96;
export const PLAYER_DRAW_SIZE = 110;
export const OBSTACLE_DRAW_SIZE = 108;
export const COLLECTIBLE_DRAW_SIZE = 104;

export const BG_NATIVE_WIDTH = 4096;
export const BG_NATIVE_HEIGHT = 512;
export const BG_DRAW_HEIGHT = INTERNAL_HEIGHT;
export const BG_DRAW_WIDTH = (BG_NATIVE_WIDTH / BG_NATIVE_HEIGHT) * BG_DRAW_HEIGHT;

export const PLAYER_X = 180;
export const GROUND_LINE_Y = INTERNAL_HEIGHT - 30;
export const PLAYER_GROUND_Y = GROUND_LINE_Y - PLAYER_DRAW_SIZE;

export const GRAVITY = 2200;
export const JUMP_VELOCITY = -860;
export const RUN_ANIMATION_INTERVAL_MS = 125;

export const START_SPEED = 292;
export const MAX_SPEED = 620;
export const SPEED_INCREASE_EVERY_SCORE = 100;
export const SPEED_STEP_PER_100_SCORE = 18;
export const MAX_SPEED_STEPS = Math.floor((MAX_SPEED - START_SPEED) / SPEED_STEP_PER_100_SCORE);
export const BACKGROUND_SPEED_FACTOR = 1;

export const START_OBSTACLE_INTERVAL = { min: 1.45, max: 2.25 };
export const MAX_DIFFICULTY_OBSTACLE_INTERVAL = { min: 0.92, max: 1.45 };
export const MIN_GAP_SPEED_FACTOR = 0.95;

export const START_COLLECTIBLE_INTERVAL = { min: 2.05, max: 3.2 };
export const MAX_COLLECTIBLE_INTERVAL = { min: 1.35, max: 2.3 };

export const SCORE_PER_SECOND = 5;
export const SCORE_PER_COLLECTIBLE = 10;

export const HITBOXES = {
  playerRun: { x: 22, y: 18, w: 52, h: 70 },
  playerJump: { x: 24, y: 16, w: 48, h: 72 },
  playerCrouch: { x: 18, y: 42, w: 60, h: 40 },
  bedug: { x: 20, y: 30, w: 56, h: 58 },
  kurma: { x: 18, y: 26, w: 60, h: 66 },
  lentera: { x: 26, y: 14, w: 44, h: 72 },
  ketupat: { x: 28, y: 24, w: 40, h: 40 },
} as const satisfies Record<string, HitboxRect>;

export const ASSET_MANIFEST = {
  background: "background.png",
  baseIdle: "base-idle.png",
  left: "left.png",
  right: "right.png",
  jump: "jump.png",
  bodyDown: "body-down.png",
  bedug: "bedug.png",
  kurma: "kurma%20berduri.png",
  lentera: "lentera.png",
  ketupat: "ketupat.png",
} as const;
