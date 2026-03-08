import { retry } from "./retries";

interface WanClientConfig {
  apiKey: string;
  baseUrl: string;
  syncEndpoint: string;
  asyncEndpoint: string;
  taskEndpointTemplate: string;
  timeoutMs: number;
  pollIntervalMs: number;
  maxPollMs: number;
  useAsync: boolean;
}

interface WanGenerateInput {
  model: string;
  prompt: string;
  imageDataUrls?: string[];
  size?: string;
  negativePrompt?: string;
  seed?: number;
  promptExtend?: boolean;
}

function requiredApiKey(): string {
  const value = process.env.WAN_API_KEY ?? process.env.QWEN_API_KEY;
  if (!value) {
    throw new Error("WAN_API_KEY atau QWEN_API_KEY belum diset.");
  }
  return value;
}

function withBase(baseUrl: string, endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  return value.toLowerCase() === "true";
}

function parseNum(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeTaskEndpoint(template: string, taskId: string): string {
  return template.replace("{taskId}", taskId).replace("{task_id}", taskId);
}

function buildWanPayload(input: WanGenerateInput) {
  const imageDataUrls = input.imageDataUrls ?? [];
  const hasImage = imageDataUrls.length > 0;
  const content = [{ text: input.prompt }, ...imageDataUrls.map((image) => ({ image }))];

  return {
    model: input.model,
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters: {
      size: input.size ?? process.env.WAN_SIZE ?? "1024*1536",
      negative_prompt: input.negativePrompt,
      watermark: parseBool(process.env.WAN_WATERMARK, false),
      prompt_extend: input.promptExtend ?? parseBool(process.env.WAN_PROMPT_EXTEND, true),
      enable_interleave: !hasImage,
      n: hasImage ? 1 : undefined,
      max_images: hasImage ? undefined : 1,
      seed: Number.isInteger(input.seed) ? input.seed : undefined,
    },
  };
}

function extractImageUrl(payload: unknown): string | undefined {
  const choices = (payload as { output?: { choices?: Array<{ message?: { content?: Array<{ type?: string; image?: string }> } }> } })?.output?.choices;
  if (!choices?.length) {
    return undefined;
  }

  for (const choice of choices) {
    const content = choice.message?.content ?? [];
    for (const block of content) {
      if (block.type === "image" && block.image) {
        return block.image;
      }
      if (!block.type && block.image) {
        return block.image;
      }
    }
  }

  return undefined;
}

export class WanImageClient {
  private readonly config: WanClientConfig;

  constructor(config?: Partial<WanClientConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? requiredApiKey(),
      baseUrl:
        config?.baseUrl ??
        process.env.WAN_BASE_URL ??
        "https://dashscope-intl.aliyuncs.com/api/v1",
      syncEndpoint:
        config?.syncEndpoint ??
        process.env.WAN_SYNC_ENDPOINT ??
        "/services/aigc/multimodal-generation/generation",
      asyncEndpoint:
        config?.asyncEndpoint ??
        process.env.WAN_ASYNC_ENDPOINT ??
        "/services/aigc/image-generation/generation",
      taskEndpointTemplate:
        config?.taskEndpointTemplate ??
        process.env.WAN_TASK_ENDPOINT ??
        "/tasks/{taskId}",
      timeoutMs: config?.timeoutMs ?? parseNum(process.env.WAN_TIMEOUT_MS, 240_000),
      pollIntervalMs:
        config?.pollIntervalMs ?? parseNum(process.env.WAN_POLL_INTERVAL_MS, 5_000),
      maxPollMs: config?.maxPollMs ?? parseNum(process.env.WAN_MAX_POLL_MS, 300_000),
      useAsync: config?.useAsync ?? parseBool(process.env.WAN_USE_ASYNC, true),
    };
  }

  async generateImage(input: WanGenerateInput): Promise<Buffer> {
    const hasImage = (input.imageDataUrls?.length ?? 0) > 0;
    if (!this.config.useAsync && hasImage) {
      try {
        return await this.generateSync(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/does not support synchronous calls/i.test(message)) {
          throw error;
        }
      }
    }
    return this.generateAsync(input);
  }

  private async generateSync(input: WanGenerateInput): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const url = withBase(this.config.baseUrl, this.config.syncEndpoint);

    try {
      const response = await retry(
        async () =>
          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buildWanPayload(input)),
            signal: controller.signal,
          }),
        { retries: 1, minDelayMs: 800 },
      );

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 600);
        throw new Error(
          `WAN sync error ${response.status}${errorText ? `: ${errorText}` : ""}`,
        );
      }

      const payload = (await response.json()) as unknown;
      const imageUrl = extractImageUrl(payload);
      if (!imageUrl) {
        throw new Error("WAN sync response tidak punya URL image.");
      }
      return this.downloadImage(imageUrl);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async generateAsync(input: WanGenerateInput): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const createUrl = withBase(this.config.baseUrl, this.config.asyncEndpoint);

    try {
      const createResponse = await retry(
        async () =>
          fetch(createUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
              "X-DashScope-Async": "enable",
            },
            body: JSON.stringify(buildWanPayload(input)),
            signal: controller.signal,
          }),
        { retries: 1, minDelayMs: 1000 },
      );

      if (!createResponse.ok) {
        const errorText = (await createResponse.text()).slice(0, 600);
        throw new Error(
          `WAN async create error ${createResponse.status}${errorText ? `: ${errorText}` : ""}`,
        );
      }

      const created = (await createResponse.json()) as {
        output?: { task_id?: string };
      };
      const taskId = created.output?.task_id;
      if (!taskId) {
        throw new Error("WAN async create tidak mengembalikan task_id.");
      }

      return this.pollTaskResult(taskId);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollTaskResult(taskId: string): Promise<Buffer> {
    const startedAt = Date.now();
    const taskEndpoint = normalizeTaskEndpoint(this.config.taskEndpointTemplate, taskId);
    const taskUrl = withBase(this.config.baseUrl, taskEndpoint);

    while (Date.now() - startedAt <= this.config.maxPollMs) {
      const response = await retry(
        async () =>
          fetch(taskUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
            },
          }),
        { retries: 1, minDelayMs: 900 },
      );

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 600);
        throw new Error(
          `WAN task poll error ${response.status}${errorText ? `: ${errorText}` : ""}`,
        );
      }

      const payload = (await response.json()) as {
        output?: {
          task_status?: string;
          choices?: Array<{ message?: { content?: Array<{ type?: string; image?: string }> } }>;
        };
        message?: string;
        code?: string;
      };

      const status = payload.output?.task_status;
      if (status === "SUCCEEDED") {
        const imageUrl = extractImageUrl(payload);
        if (!imageUrl) {
          throw new Error("WAN task SUCCEEDED tapi URL image tidak ditemukan.");
        }
        return this.downloadImage(imageUrl);
      }

      if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
        const reason = payload.message ?? payload.code ?? "Task gagal";
        throw new Error(`WAN task ${status}: ${reason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }

    throw new Error(
      `WAN task timeout setelah ${Math.round(this.config.maxPollMs / 1000)} detik.`,
    );
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const response = await retry(
      async () => fetch(imageUrl),
      { retries: 2, minDelayMs: 900, maxDelayMs: 3000 },
    );

    if (!response.ok) {
      throw new Error(`WAN image download error ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  }
}
