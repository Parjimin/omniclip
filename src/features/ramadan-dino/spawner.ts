import {
  COLLECTIBLE_DRAW_SIZE,
  GROUND_LINE_Y,
  MAX_COLLECTIBLE_INTERVAL,
  MAX_DIFFICULTY_OBSTACLE_INTERVAL,
  MAX_SPEED,
  MIN_GAP_SPEED_FACTOR,
  OBSTACLE_DRAW_SIZE,
  SPEED_INCREASE_EVERY_SCORE,
  SPEED_STEP_PER_100_SCORE,
  START_COLLECTIBLE_INTERVAL,
  START_OBSTACLE_INTERVAL,
  START_SPEED,
  MAX_SPEED_STEPS,
} from "./constants";
import { ObstacleType, WorldEntity } from "./types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function calculateDifficulty(score: number) {
  const step = Math.max(0, Math.floor(score / SPEED_INCREASE_EVERY_SCORE));
  const tier = Math.min(MAX_SPEED_STEPS, step);
  const t = MAX_SPEED_STEPS === 0 ? 1 : tier / MAX_SPEED_STEPS;
  const ease = smoothstep(t);
  return {
    ease,
    speed: Math.min(MAX_SPEED, START_SPEED + tier * SPEED_STEP_PER_100_SCORE),
    obstacleMin: lerp(START_OBSTACLE_INTERVAL.min, MAX_DIFFICULTY_OBSTACLE_INTERVAL.min, ease),
    obstacleMax: lerp(START_OBSTACLE_INTERVAL.max, MAX_DIFFICULTY_OBSTACLE_INTERVAL.max, ease),
    collectibleMin: lerp(START_COLLECTIBLE_INTERVAL.min, MAX_COLLECTIBLE_INTERVAL.min, ease),
    collectibleMax: lerp(START_COLLECTIBLE_INTERVAL.max, MAX_COLLECTIBLE_INTERVAL.max, ease),
  };
}

export function nextObstacleDelay(speed: number, min: number, max: number): number {
  const interval = randomBetween(min, max);
  const byGap = MIN_GAP_SPEED_FACTOR;
  // Ensure distance >= speed * 0.95 while still following scaling interval.
  return Math.max(byGap, interval);
}

export function chooseObstacleType(state: {
  airStreak: number;
  lastObstacleType: ObstacleType | null;
}): ObstacleType {
  if (state.airStreak >= 2) {
    return Math.random() > 0.5 ? "bedug" : "kurma";
  }

  const roll = Math.random();
  if (roll < 0.43) {
    return "bedug";
  }
  if (roll < 0.86) {
    return "kurma";
  }

  if (state.lastObstacleType === "lentera" && Math.random() > 0.4) {
    return "bedug";
  }

  return "lentera";
}

export function spawnObstacle(args: {
  id: number;
  type: ObstacleType;
  spawnX: number;
}): WorldEntity {
  const y = args.type === "lentera" ? 26 : GROUND_LINE_Y - OBSTACLE_DRAW_SIZE;
  return {
    id: args.id,
    type: args.type,
    x: args.spawnX,
    y,
    size: OBSTACLE_DRAW_SIZE,
  };
}

export function nextCollectibleDelay(min: number, max: number): number {
  return randomBetween(min, max);
}

export function spawnCollectible(args: {
  id: number;
  spawnX: number;
  lastObstacleType: ObstacleType | null;
}): WorldEntity {
  const y = args.lastObstacleType === "lentera" ? GROUND_LINE_Y - 88 : GROUND_LINE_Y - 164;
  return {
    id: args.id,
    type: "ketupat",
    x: args.spawnX,
    y,
    size: COLLECTIBLE_DRAW_SIZE,
    baseY: y,
    bobPhase: Math.random() * Math.PI * 2,
    bobAmplitude: 8 + Math.random() * 4,
    bobSpeed: 2.4 + Math.random() * 0.6,
  };
}
