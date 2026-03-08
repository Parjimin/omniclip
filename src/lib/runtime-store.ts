import { EventEmitter } from "node:events";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import {
  ensureCharacterPreferences,
  ensureGenerationPreferences,
  GenerationEvent,
  GenerationJob,
  GenerationProgress,
  SessionCreateInput,
  SessionState,
} from "@/features/manga/types";

const sessions = new Map<string, SessionState>();
const jobs = new Map<string, GenerationJob>();
const emitters = new Map<string, EventEmitter>();
const STORAGE_ROOT = path.join(process.cwd(), "storage");

const DEFAULT_PROGRESS: GenerationProgress = {
  value: 0,
  stage: "queued",
  message: "Job dibuat",
};

function sessionFilePath(sessionId: string) {
  return path.join(STORAGE_ROOT, "sessions", sessionId, "session.json");
}

function jobFilePath(jobId: string) {
  return path.join(STORAGE_ROOT, "jobs", jobId, "job.json");
}

function writeJsonSync(filePath: string, data: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readJsonSync<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) {
    return undefined;
  }
  try {
    const raw = readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function getOrCreateEmitter(jobId: string) {
  if (!emitters.has(jobId)) {
    emitters.set(jobId, new EventEmitter());
  }
  return emitters.get(jobId)!;
}

function normalizeSession(session: SessionState): SessionState {
  return {
    ...session,
    characterPreferences: ensureCharacterPreferences(
      session.characterPreferences,
    ),
    generationPreferences: ensureGenerationPreferences(
      session.generationPreferences,
    ),
  };
}

export function createSession(input: SessionCreateInput) {
  const id = uuidv4();
  const session = normalizeSession({
    id,
    createdAt: Date.now(),
    selectedChoices: {},
    ...input,
  });
  sessions.set(id, session);
  writeJsonSync(sessionFilePath(id), session);
  return session;
}

export function getSession(sessionId: string) {
  const inMemory = sessions.get(sessionId);
  if (inMemory) {
    const normalized = normalizeSession(inMemory);
    sessions.set(sessionId, normalized);
    return normalized;
  }

  const fromDisk = readJsonSync<SessionState>(sessionFilePath(sessionId));
  if (fromDisk) {
    const normalized = normalizeSession(fromDisk);
    sessions.set(sessionId, normalized);
    writeJsonSync(sessionFilePath(sessionId), normalized);
    return normalized;
  }

  return undefined;
}

export function updateSession(sessionId: string, patch: Partial<SessionState>) {
  const current = getSession(sessionId);
  if (!current) {
    return undefined;
  }

  const next = normalizeSession({
    ...current,
    ...patch,
  });

  sessions.set(sessionId, next);
  writeJsonSync(sessionFilePath(sessionId), next);
  return next;
}

export function createGenerationJob(sessionId: string) {
  const id = uuidv4();
  const job: GenerationJob = {
    id,
    sessionId,
    status: "queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    progress: DEFAULT_PROGRESS,
    logs: [],
    events: [],
  };
  jobs.set(id, job);
  writeJsonSync(jobFilePath(id), job);
  appendJobEvent(id, "snapshot", {
    status: job.status,
    progress: job.progress,
  });
  return job;
}

export function getGenerationJob(jobId: string) {
  const inMemory = jobs.get(jobId);
  if (inMemory) {
    return inMemory;
  }

  const fromDisk = readJsonSync<GenerationJob>(jobFilePath(jobId));
  if (fromDisk) {
    jobs.set(jobId, fromDisk);
    return fromDisk;
  }

  return undefined;
}

export function updateGenerationJob(jobId: string, patch: Partial<GenerationJob>) {
  const current = getGenerationJob(jobId);
  if (!current) {
    return undefined;
  }

  const next: GenerationJob = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  jobs.set(jobId, next);
  writeJsonSync(jobFilePath(jobId), next);
  return next;
}

export function setJobProgress(
  jobId: string,
  progress: GenerationProgress,
  status?: GenerationJob["status"],
) {
  const current = getGenerationJob(jobId);
  if (!current) {
    return;
  }

  const next: GenerationJob = {
    ...current,
    status: status ?? current.status,
    progress,
    updatedAt: Date.now(),
  };
  jobs.set(jobId, next);
  writeJsonSync(jobFilePath(jobId), next);
  appendJobEvent(jobId, "progress", {
    status: next.status,
    progress: next.progress,
  });
}

export function appendJobLog(jobId: string, log: string) {
  const current = getGenerationJob(jobId);
  if (!current) {
    return;
  }

  const next: GenerationJob = {
    ...current,
    logs: [...current.logs, log].slice(-200),
    updatedAt: Date.now(),
  };
  jobs.set(jobId, next);
  writeJsonSync(jobFilePath(jobId), next);
}

export function appendJobEvent(
  jobId: string,
  type: GenerationEvent["type"],
  data: unknown,
) {
  const current = getGenerationJob(jobId);
  const event: GenerationEvent = {
    type,
    data,
    at: Date.now(),
  };

  if (current) {
    const next: GenerationJob = {
      ...current,
      events: [...current.events, event].slice(-400),
      updatedAt: Date.now(),
    };
    jobs.set(jobId, next);
    writeJsonSync(jobFilePath(jobId), next);
  }

  const emitter = getOrCreateEmitter(jobId);
  emitter.emit("event", event);
}

export function subscribeJobEvents(
  jobId: string,
  listener: (event: GenerationEvent) => void,
) {
  const emitter = getOrCreateEmitter(jobId);
  emitter.on("event", listener);

  return () => {
    emitter.off("event", listener);
  };
}
