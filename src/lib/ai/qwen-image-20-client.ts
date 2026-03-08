import { retry } from "./retries";
import { APP_CONFIG } from "@/lib/app-config";

interface QwenImage20ClientConfig {
  apiKey: string;
  baseUrl: string;
  endpoint: string;
  timeoutMs: number;
  downloadTimeoutMs: number;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} belum diset.`);
  }
  return value;
}

function withBase(baseUrl: string, endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
}

export class QwenImage20Client {
  private readonly config: QwenImage20ClientConfig;

  constructor(config?: Partial<QwenImage20ClientConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? requiredEnv("QWEN_API_KEY"),
      baseUrl: config?.baseUrl ?? APP_CONFIG.qwenImage20.baseUrl,
      endpoint: config?.endpoint ?? APP_CONFIG.qwenImage20.endpoint,
      timeoutMs: config?.timeoutMs ?? APP_CONFIG.qwenImage20.timeoutMs,
      downloadTimeoutMs: config?.downloadTimeoutMs ?? APP_CONFIG.qwenImage20.downloadTimeoutMs,
    };
  }

  async editImage(args: {
    model: string;
    prompt: string;
    images: string[];
    negativePrompt?: string;
    size?: string;
    seed?: number;
    promptExtend?: boolean;
    trueCfgScale?: number;
    guidanceScale?: number;
    numInferenceSteps?: number;
  }): Promise<Buffer> {
    const url = withBase(this.config.baseUrl, this.config.endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await retry(
        async () =>
          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: args.model,
              input: {
                messages: [
                  {
                    role: "user",
                    content: [
                      ...args.images.map((image) => ({ image })),
                      { text: args.prompt },
                    ],
                  },
                ],
              },
              parameters: {
                n: 1,
                watermark: false,
                negative_prompt: args.negativePrompt,
                prompt_extend: args.promptExtend ?? true,
                size: args.size ?? "1024*1536",
                seed: Number.isInteger(args.seed) ? args.seed : undefined,
                true_cfg_scale: args.trueCfgScale,
                guidance_scale: args.guidanceScale,
                num_inference_steps: args.numInferenceSteps,
              },
            }),
            signal: controller.signal,
          }),
        { retries: 1, minDelayMs: 1200, maxDelayMs: 3000 },
      );

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Qwen image 2.0 edit error ${response.status}: ${payload.slice(0, 500)}`);
      }

      const payload = (await response.json()) as {
        output?: {
          results?: Array<{
            url?: string;
          }>;
          choices?: Array<{
            message?: {
              content?: Array<{
                image?: string;
                type?: string;
              }>;
            };
          }>;
        };
      };

      const imageUrl =
        payload.output?.results?.[0]?.url ??
        payload.output?.choices?.[0]?.message?.content?.find(
          (item) => item.image && (!item.type || item.type === "image"),
        )?.image;

      if (!imageUrl) {
        throw new Error(
          `Qwen image 2.0 edit response tidak berisi image URL. raw=${JSON.stringify(payload).slice(0, 800)}`,
        );
      }

      const imageResponse = await retry(async () => {
        const downloadController = new AbortController();
        const downloadTimeout = setTimeout(
          () => downloadController.abort(),
          this.config.downloadTimeoutMs,
        );

        try {
          return await fetch(imageUrl, { signal: downloadController.signal });
        } finally {
          clearTimeout(downloadTimeout);
        }
      }, { retries: 2, minDelayMs: 1500, maxDelayMs: 5000 });

      if (!imageResponse.ok) {
        throw new Error(`Gagal download hasil Qwen image 2.0 (${imageResponse.status}).`);
      }

      const bytes = await imageResponse.arrayBuffer();
      return Buffer.from(bytes);
    } finally {
      clearTimeout(timeout);
    }
  }
}
