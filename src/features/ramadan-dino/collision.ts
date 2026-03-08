import { HitboxRect, ObstacleType, PlayerEntity, WorldEntity } from "./types";
import { HITBOXES, PLAYER_DRAW_SIZE, SPRITE_SIZE } from "./constants";

export function intersectsAabb(a: HitboxRect, b: HitboxRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function entityRect(entity: WorldEntity): HitboxRect {
  const source = HITBOXES[entity.type];
  const scale = entity.size / SPRITE_SIZE;
  return {
    x: entity.x + source.x * scale,
    y: entity.y + source.y * scale,
    w: source.w * scale,
    h: source.h * scale,
  };
}

export function playerRect(player: PlayerEntity): HitboxRect {
  const source =
    player.state === "JUMP"
      ? HITBOXES.playerJump
      : player.state === "CROUCH"
        ? HITBOXES.playerCrouch
        : HITBOXES.playerRun;
  const scale = PLAYER_DRAW_SIZE / SPRITE_SIZE;
  return {
    x: player.x + source.x * scale,
    y: player.y + source.y * scale,
    w: source.w * scale,
    h: source.h * scale,
  };
}

export function isObstacleType(
  type: WorldEntity["type"],
): type is ObstacleType {
  return type === "bedug" || type === "kurma" || type === "lentera";
}
