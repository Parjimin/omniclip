import {
  GRAVITY,
  JUMP_VELOCITY,
  MIN_JUMP_VELOCITY,
  MAX_JUMP_HOLD_MS,
  PLAYER_GROUND_Y,
  RUN_ANIMATION_INTERVAL_MS,
} from "./constants";
import { PlayerEntity } from "./types";

/**
 * Variable jump: initial velocity is MIN_JUMP_VELOCITY (quick tap).
 * While holding jump, velocity lerps toward JUMP_VELOCITY over MAX_JUMP_HOLD_MS.
 * Releasing early gives a shorter jump. Holding longer gives a taller jump.
 */
export function updatePlayerPhysics(args: {
  player: PlayerEntity;
  dt: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  jumpHoldMs: number;
  crouchHeld: boolean;
}): { jumped: boolean } {
  const { player, dt, jumpPressed, jumpHeld, jumpHoldMs, crouchHeld } = args;
  let jumped = false;

  // Initiate jump on press
  if (jumpPressed && player.onGround && !crouchHeld) {
    player.vy = MIN_JUMP_VELOCITY;
    player.onGround = false;
    player.state = "JUMP";
    jumped = true;
  }

  // While in air and still holding jump, boost the velocity based on hold time
  if (!player.onGround && jumpHeld && player.vy < 0 && jumpHoldMs < MAX_JUMP_HOLD_MS) {
    const t = Math.min(jumpHoldMs / MAX_JUMP_HOLD_MS, 1);
    // Smoothly lerp between min and max jump velocity
    const targetVy = MIN_JUMP_VELOCITY + (JUMP_VELOCITY - MIN_JUMP_VELOCITY) * t;
    // Only boost upward (more negative), never reduce
    if (targetVy < player.vy) {
      player.vy = targetVy;
    }
  }

  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;

  if (player.y >= PLAYER_GROUND_Y) {
    player.y = PLAYER_GROUND_Y;
    player.vy = 0;
    player.onGround = true;
  }

  if (!player.onGround) {
    player.state = "JUMP";
    return { jumped };
  }

  if (crouchHeld) {
    player.state = "CROUCH";
    return { jumped };
  }

  player.state = "RUN";
  player.runAnimMs += dt * 1000;
  if (player.runAnimMs >= RUN_ANIMATION_INTERVAL_MS) {
    player.runAnimMs = 0;
    player.runFrameLeft = !player.runFrameLeft;
  }
  return { jumped };
}
