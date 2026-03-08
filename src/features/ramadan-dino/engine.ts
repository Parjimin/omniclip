import { loadAssets, LoadedAssets } from "./assets";
import {
  BACKGROUND_SPEED_FACTOR,
  BG_DRAW_WIDTH,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  PLAYER_GROUND_Y,
  PLAYER_X,
  SCORE_PER_COLLECTIBLE,
  SCORE_PER_SECOND,
  START_SPEED,
} from "./constants";
import { entityRect, intersectsAabb, isObstacleType, playerRect } from "./collision";
import { InputController } from "./input";
import { updatePlayerPhysics } from "./physics";
import {
  calculateDifficulty,
  chooseObstacleType,
  nextCollectibleDelay,
  nextObstacleDelay,
  spawnCollectible,
  spawnObstacle,
} from "./spawner";
import {
  EngineStatus,
  ObstacleType,
  PlayerEntity,
  RamadanDinoOptions,
  RamadanDinoPublicApi,
  RamadanDinoState,
  StopReason,
  WorldEntity,
} from "./types";
import { renderFrame } from "./renderer";

const DEFAULT_OPTIONS: Required<
  Pick<RamadanDinoOptions, "width" | "height" | "assetsBasePath">
> = {
  width: INTERNAL_WIDTH,
  height: INTERNAL_HEIGHT,
  assetsBasePath: "/game-assets",
};

export class RamadanDinoEngine implements RamadanDinoPublicApi {
  private containerEl: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private options: RamadanDinoOptions = {};
  private input = new InputController();
  private assets: LoadedAssets | null = null;
  private status: EngineStatus = "idle";
  private reason: StopReason | undefined;
  private rafId: number | null = null;
  private lastFrameTs = 0;
  private elapsedMs = 0;
  private score = 0;
  private scoreFloat = 0;
  private collectibleScore = 0;
  private bgX1 = 0;
  private bgX2 = BG_DRAW_WIDTH;
  private nextObstacleIn = 1.2;
  private nextCollectibleIn = 2;
  private nextEntityId = 1;
  private obstacles: WorldEntity[] = [];
  private collectibles: WorldEntity[] = [];
  private airStreak = 0;
  private lastObstacleType: ObstacleType | null = null;
  private restartListenersBound = false;
  private player: PlayerEntity = {
    x: PLAYER_X,
    y: PLAYER_GROUND_Y,
    vy: 0,
    state: "RUN",
    onGround: true,
    runFrameLeft: true,
    runAnimMs: 0,
  };
  private readonly onRestartKeyDown = (event: KeyboardEvent) => {
    if (this.status !== "game_over") {
      return;
    }
    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      this.restartFromGameOver();
    }
  };
  private readonly onRestartPointerDown = () => {
    if (this.status === "game_over") {
      this.restartFromGameOver();
    }
  };

  init(containerEl: HTMLElement, options?: RamadanDinoOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.containerEl = containerEl;

    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "ramadan-dino-canvas";
      this.canvas.width = this.options.width ?? INTERNAL_WIDTH;
      this.canvas.height = this.options.height ?? INTERNAL_HEIGHT;
      this.containerEl.innerHTML = "";
      this.containerEl.classList.add("ramadan-dino-shell");
      this.containerEl.appendChild(this.canvas);
      const context = this.canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context tidak tersedia");
      }
      this.ctx = context;
    }

    this.resetWorld();
    this.render();
  }

  start() {
    void this.startInternal();
  }

  stop(reason: StopReason = "manual") {
    if (this.status === "stopped" || this.status === "idle") {
      this.reason = reason;
      return;
    }

    this.status = "stopped";
    this.reason = reason;
    this.cancelLoop();
    this.unbindRestartListeners();
    this.input.unbind();
    this.options.onExit?.(reason);
    this.render();
  }

  getScore() {
    return this.score;
  }

  getState(): RamadanDinoState {
    return {
      status: this.status,
      score: this.score,
      elapsedMs: this.elapsedMs,
      playerState: this.player.state,
      reason: this.reason,
    };
  }

  private async startInternal() {
    if (!this.canvas || !this.ctx) {
      throw new Error("Game belum di-init");
    }
    if (this.status === "running") {
      return;
    }

    if (!this.assets) {
      this.assets = await loadAssets(this.options.assetsBasePath);
    }

    this.resetWorld();
    this.status = "running";
    this.reason = undefined;
    this.unbindRestartListeners();
    this.input.bind(this.canvas);
    this.lastFrameTs = performance.now();
    this.loop(this.lastFrameTs);
  }

  private resetWorld() {
    this.elapsedMs = 0;
    this.score = 0;
    this.scoreFloat = 0;
    this.collectibleScore = 0;
    this.bgX1 = 0;
    this.bgX2 = BG_DRAW_WIDTH;
    this.nextObstacleIn = 1.2;
    this.nextCollectibleIn = 2;
    this.obstacles = [];
    this.collectibles = [];
    this.airStreak = 0;
    this.lastObstacleType = null;
    this.nextEntityId = 1;
    this.player = {
      x: PLAYER_X,
      y: PLAYER_GROUND_Y,
      vy: 0,
      state: "RUN",
      onGround: true,
      runFrameLeft: true,
      runAnimMs: 0,
    };
  }

  private loop = (timestamp: number) => {
    if (this.status !== "running") {
      return;
    }

    const dt = Math.min(0.033, (timestamp - this.lastFrameTs) / 1000);
    this.lastFrameTs = timestamp;

    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.elapsedMs += dt * 1000;
    const difficulty = calculateDifficulty(this.score);

    updatePlayerPhysics({
      player: this.player,
      dt,
      jumpPressed: this.input.consumeJump(),
      crouchHeld: this.input.isCrouchHeld(),
    });

    this.bgX1 -= difficulty.speed * BACKGROUND_SPEED_FACTOR * dt;
    this.bgX2 -= difficulty.speed * BACKGROUND_SPEED_FACTOR * dt;

    if (this.bgX1 <= -BG_DRAW_WIDTH) {
      this.bgX1 = this.bgX2 + BG_DRAW_WIDTH;
    }
    if (this.bgX2 <= -BG_DRAW_WIDTH) {
      this.bgX2 = this.bgX1 + BG_DRAW_WIDTH;
    }

    for (const obstacle of this.obstacles) {
      obstacle.x -= difficulty.speed * dt;
    }
    for (const collectible of this.collectibles) {
      collectible.x -= difficulty.speed * dt;
      if (
        typeof collectible.baseY === "number" &&
        typeof collectible.bobAmplitude === "number" &&
        typeof collectible.bobPhase === "number" &&
        typeof collectible.bobSpeed === "number"
      ) {
        collectible.y =
          collectible.baseY +
          Math.sin(this.elapsedMs / 1000 * collectible.bobSpeed + collectible.bobPhase) *
            collectible.bobAmplitude;
      }
    }

    this.obstacles = this.obstacles.filter((item) => item.x + item.size > -10);
    this.collectibles = this.collectibles.filter((item) => item.x + item.size > -10);

    this.nextObstacleIn -= dt;
    if (this.nextObstacleIn <= 0) {
      const type = chooseObstacleType({
        airStreak: this.airStreak,
        lastObstacleType: this.lastObstacleType,
      });
      const entity = spawnObstacle({
        id: this.nextEntityId++,
        type,
        spawnX: INTERNAL_WIDTH + 40,
      });
      this.obstacles.push(entity);
      this.lastObstacleType = type;
      this.airStreak = type === "lentera" ? this.airStreak + 1 : 0;
      this.nextObstacleIn = nextObstacleDelay(
        difficulty.speed,
        difficulty.obstacleMin,
        difficulty.obstacleMax,
      );
    }

    this.nextCollectibleIn -= dt;
    if (this.nextCollectibleIn <= 0) {
      const x = INTERNAL_WIDTH + 180 + Math.random() * 220;
      const nearObstacle = this.obstacles.some((obs) => Math.abs(obs.x - x) < 164);
      if (!nearObstacle) {
        this.collectibles.push(
          spawnCollectible({
            id: this.nextEntityId++,
            spawnX: x,
            lastObstacleType: this.lastObstacleType,
          }),
        );
      }
      this.nextCollectibleIn = nextCollectibleDelay(
        difficulty.collectibleMin,
        difficulty.collectibleMax,
      );
    }

    const playerHitbox = playerRect(this.player);

    for (const obstacle of this.obstacles) {
      const obstacleHitbox = entityRect(obstacle);
      if (intersectsAabb(playerHitbox, obstacleHitbox)) {
        this.status = "game_over";
        this.reason = "game_over";
        this.cancelLoop();
        this.input.unbind();
        this.bindRestartListeners();
        this.options.onGameOver?.(this.score);
        this.options.onExit?.("game_over");
        this.render();
        return;
      }
    }

    const remainingCollectibles: WorldEntity[] = [];
    for (const item of this.collectibles) {
      const collectibleHitbox = entityRect(item);
      if (intersectsAabb(playerHitbox, collectibleHitbox)) {
        this.collectibleScore += SCORE_PER_COLLECTIBLE;
      } else {
        remainingCollectibles.push(item);
      }
    }
    this.collectibles = remainingCollectibles;

    const speedMultiplier = difficulty.speed / START_SPEED;
    this.scoreFloat += SCORE_PER_SECOND * speedMultiplier * dt;
    const nextScore = Math.floor(this.scoreFloat + this.collectibleScore);
    if (nextScore !== this.score) {
      this.score = nextScore;
      this.options.onScoreChange?.(this.score);
    }
  }

  private cancelLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private bindRestartListeners() {
    if (this.restartListenersBound || !this.canvas) {
      return;
    }
    this.restartListenersBound = true;
    window.addEventListener("keydown", this.onRestartKeyDown);
    this.canvas.addEventListener("pointerdown", this.onRestartPointerDown);
  }

  private unbindRestartListeners() {
    if (!this.restartListenersBound) {
      return;
    }
    this.restartListenersBound = false;
    window.removeEventListener("keydown", this.onRestartKeyDown);
    this.canvas?.removeEventListener("pointerdown", this.onRestartPointerDown);
  }

  private restartFromGameOver() {
    if (this.status !== "game_over") {
      return;
    }
    this.unbindRestartListeners();
    this.status = "idle";
    void this.startInternal();
  }

  private render() {
    if (!this.ctx || !this.assets) {
      return;
    }
    renderFrame({
      ctx: this.ctx,
      assets: this.assets,
      status: this.status,
      score: this.score,
      player: this.player,
      obstacles: this.obstacles.filter((entity) => isObstacleType(entity.type)),
      collectibles: this.collectibles,
      bgX1: this.bgX1,
      bgX2: this.bgX2,
    });
  }
}
