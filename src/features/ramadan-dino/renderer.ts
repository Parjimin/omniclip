import {
  BG_DRAW_HEIGHT,
  BG_DRAW_WIDTH,
  COLLECTIBLE_DRAW_SIZE,
  GROUND_LINE_Y,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  PLAYER_DRAW_SIZE,
} from "./constants";
import { LoadedAssets } from "./assets";
import { PlayerEntity, WorldEntity } from "./types";

export function renderFrame(args: {
  ctx: CanvasRenderingContext2D;
  assets: LoadedAssets;
  status: "idle" | "running" | "stopped" | "game_over";
  score: number;
  player: PlayerEntity;
  obstacles: WorldEntity[];
  collectibles: WorldEntity[];
  bgX1: number;
  bgX2: number;
}) {
  const { ctx, assets } = args;

  ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(assets.background, args.bgX1, 0, BG_DRAW_WIDTH, BG_DRAW_HEIGHT);
  ctx.drawImage(assets.background, args.bgX2, 0, BG_DRAW_WIDTH, BG_DRAW_HEIGHT);

  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(0, GROUND_LINE_Y, INTERNAL_WIDTH, INTERNAL_HEIGHT - GROUND_LINE_Y);

  for (const obstacle of args.obstacles) {
    const sprite =
      obstacle.type === "bedug"
        ? assets.bedug
        : obstacle.type === "kurma"
          ? assets.kurma
          : assets.lentera;
    ctx.drawImage(sprite, obstacle.x, obstacle.y, obstacle.size, obstacle.size);
  }

  for (const collectible of args.collectibles) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 238, 182, 0.22)";
    ctx.beginPath();
    ctx.ellipse(
      collectible.x + collectible.size / 2,
      collectible.y + collectible.size / 2 + 8,
      COLLECTIBLE_DRAW_SIZE * 0.26,
      COLLECTIBLE_DRAW_SIZE * 0.12,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  for (const collectible of args.collectibles) {
    ctx.drawImage(
      assets.ketupat,
      collectible.x,
      collectible.y,
      collectible.size,
      collectible.size,
    );
  }

  const playerSprite =
    args.status === "idle" || args.status === "stopped"
      ? assets.baseIdle
      : args.player.state === "JUMP"
        ? assets.jump
        : args.player.state === "CROUCH"
          ? assets.bodyDown
          : args.player.runFrameLeft
            ? assets.left
            : assets.right;

  ctx.drawImage(playerSprite, args.player.x, args.player.y, PLAYER_DRAW_SIZE, PLAYER_DRAW_SIZE);

  ctx.fillStyle = "#f5f7fa";
  ctx.font = "bold 28px monospace";
  ctx.fillText(`Score: ${args.score}`, 20, 36);

  if (args.status === "game_over") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    ctx.fillStyle = "#ffe9c4";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2 - 16);
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(
      "Tekan Space / ArrowUp atau Tap untuk Coba Lagi",
      INTERNAL_WIDTH / 2,
      INTERNAL_HEIGHT / 2 + 26,
    );
    ctx.textAlign = "left";
  }
}
