import {
  GRAVITY,
  JUMP_VELOCITY,
  PLAYER_GROUND_Y,
  RUN_ANIMATION_INTERVAL_MS,
} from "./constants";
import { PlayerEntity } from "./types";

export function updatePlayerPhysics(args: {
  player: PlayerEntity;
  dt: number;
  jumpPressed: boolean;
  crouchHeld: boolean;
}) {
  const { player, dt, jumpPressed, crouchHeld } = args;

  if (jumpPressed && player.onGround && !crouchHeld) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
    player.state = "JUMP";
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
    return;
  }

  if (crouchHeld) {
    player.state = "CROUCH";
    return;
  }

  player.state = "RUN";
  player.runAnimMs += dt * 1000;
  if (player.runAnimMs >= RUN_ANIMATION_INTERVAL_MS) {
    player.runAnimMs = 0;
    player.runFrameLeft = !player.runFrameLeft;
  }
}
