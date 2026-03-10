import { retry } from "./retries";
import { APP_CONFIG } from "@/lib/app-config";

interface Wan25ClientConfig {
  apiKey: string;
  baseUrl: string;
  endpoint: string;
  taskEndpointTemplate: string;
  timeoutMs: number;
  pollIntervalMs: number;
  maxPollMs: number;
}

interface Wan25RefineInput {
  model: string;
  prompt: string;
  images: string[];
  negativePrompt?: string;
  seed?: number;
  size?: string;
  promptExtend?: boolean;
}

function requiredApiKey(): string {
  const value = process.env.WAN25_API_KEY ?? process.env.WAN_API_KEY ?? process.env.QWEN_API_KEY;
  if (!value) {
    throw new Error("WAN25_API_KEY atau WAN_API_KEY belum diset.");
  }
  return value;
}

function withBase(baseUrl: string, endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}

function normalizeTaskEndpoint(template: string, taskId: string): string {
  return template.replace("{taskId}", taskId).replace("{task_id}", taskId);
}

function extractResultImageUrl(payload: unknown): string | undefined {
  const results = (payload as { output?: { results?: Array<{ url?: string }> } })?.output?.results;
  return results?.[0]?.url;
}

function buildWan25Payload(input: Wan25RefineInput) {
  return {
    model: input.model,
    input: {
      prompt: input.prompt,
      images: input.images,
    },
    parameters: {
      negative_prompt: input.negativePrompt,
      n: 1,
      prompt_extend: input.promptExtend ?? APP_CONFIG.wan25.promptExtend,
      watermark: APP_CONFIG.wan25.watermark,
      size: input.size ?? APP_CONFIG.wan25.size,
      seed: Number.isInteger(input.seed) ? input.seed : undefined,
    },
  };
}

export class Wan25Client {
  private readonly config: Wan25ClientConfig;

  constructor(config?: Partial<Wan25ClientConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? requiredApiKey(),
      baseUrl: config?.baseUrl ?? APP_CONFIG.wan25.baseUrl,
      endpoint: config?.endpoint ?? APP_CONFIG.wan25.endpoint,
      taskEndpointTemplate: config?.taskEndpointTemplate ?? APP_CONFIG.wan25.taskEndpoint,
      timeoutMs: config?.timeoutMs ?? APP_CONFIG.wan25.timeoutMs,
      pollIntervalMs: config?.pollIntervalMs ?? APP_CONFIG.wan25.pollIntervalMs,
      maxPollMs: config?.maxPollMs ?? APP_CONFIG.wan25.maxPollMs,
    };
  }

  async refineImage(input: Wan25RefineInput): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const url = withBase(this.config.baseUrl, this.config.endpoint);

    try {
      const response = await retry(
        async () =>
          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
              "X-DashScope-Async": "enable",
            },
            body: JSON.stringify(buildWan25Payload(input)),
            signal: controller.signal,
          }),
        { retries: 1, minDelayMs: 900 },
      );

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 600);
        throw new Error(
          `WAN2.5 refine error ${response.status}${errorText ? `: ${errorText}` : ""}`,
        );
      }

      const created = (await response.json()) as { output?: { task_id?: string } };
      const taskId = created.output?.task_id;
      if (!taskId) {
        throw new Error("WAN2.5 refine tidak mengembalikan task_id.");
      }

      return this.pollTaskResult(taskId);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pollTaskResult(taskId: string): Promise<Buffer> {
    const startedAt = Date.now();
    const taskUrl = withBase(
      this.config.baseUrl,
      normalizeTaskEndpoint(this.config.taskEndpointTemplate, taskId),
    );

    while (Date.now() - startedAt <= this.config.maxPollMs) {
      const response = await retry(
        async () =>
          fetch(taskUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
            },
          }),
        { retries: 1, minDelayMs: 800 },
      );

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 600);
        throw new Error(
          `WAN2.5 task poll error ${response.status}${errorText ? `: ${errorText}` : ""}`,
        );
      }

      const payload = (await response.json()) as {
        output?: { task_status?: string; results?: Array<{ url?: string }> };
        message?: string;
      };

      const status = payload.output?.task_status;
      if (status === "SUCCEEDED") {
        const imageUrl = extractResultImageUrl(payload);
        if (!imageUrl) {
          throw new Error("WAN2.5 refine berhasil tetapi URL gambar kosong.");
        }
        return this.downloadImage(imageUrl);
      }

      if (status === "FAILED" || status === "CANCELED") {
        throw new Error(payload.message || `WAN2.5 task ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
    }

    throw new Error("WAN2.5 refine timeout saat polling task.");
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const { validateExternalUrl } = await import("@/lib/security");
    if (!validateExternalUrl(url)) {
      throw new Error("WAN2.5 image URL tidak valid atau mengarah ke host internal.");
    }

    const response = await retry(
      async () => fetch(url),
      { retries: 1, minDelayMs: 700 },
    );

    if (!response.ok) {
      throw new Error(`Download hasil WAN2.5 gagal (${response.status}).`);
    }

    const bytes = await response.arrayBuffer();
    return Buffer.from(bytes);
  }
}
