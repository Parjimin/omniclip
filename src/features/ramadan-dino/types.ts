export type PlayerState = "RUN" | "JUMP" | "CROUCH";

export type EngineStatus = "idle" | "running" | "stopped" | "game_over";

export type StopReason =
  | "generation_complete"
  | "generation_failed"
  | "manual"
  | "navigation"
  | "game_over";

export type ObstacleType = "bedug" | "kurma" | "lentera";

export interface HitboxRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WorldEntity {
  id: number;
  type: ObstacleType | "ketupat";
  x: number;
  y: number;
  size: number;
  baseY?: number;
  bobPhase?: number;
  bobAmplitude?: number;
  bobSpeed?: number;
}

export interface PlayerEntity {
  x: number;
  y: number;
  vy: number;
  state: PlayerState;
  onGround: boolean;
  runFrameLeft: boolean;
  runAnimMs: number;
}

export interface RamadanDinoState {
  status: EngineStatus;
  score: number;
  elapsedMs: number;
  playerState: PlayerState;
  reason?: StopReason;
}

export interface RamadanDinoOptions {
  width?: number;
  height?: number;
  assetsBasePath?: string;
  onScoreChange?: (score: number) => void;
  onExit?: (reason: StopReason) => void;
  onGameOver?: (finalScore: number) => void;
}

export interface RamadanDinoPublicApi {
  init(containerEl: HTMLElement, options?: RamadanDinoOptions): void;
  start(): void;
  stop(reason?: StopReason): void;
  getScore(): number;
  getState(): RamadanDinoState;
}
