import { retry } from "./retries";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface QwenClientConfig {
  apiKey: string;
  baseUrl: string;
  chatEndpoint: string;
  imageEndpoint: string;
  timeoutMs: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function ensureLeadingSlash(value: string): string {
  return value.startsWith("/") ? value : `/${value}`;
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return text.slice(first, last + 1);
  }

  return text;
}

export class QwenClient {
  private config: QwenClientConfig;

  constructor(config?: Partial<QwenClientConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? requiredEnv("QWEN_API_KEY"),
      baseUrl:
        config?.baseUrl ??
        process.env.QWEN_BASE_URL ??
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      chatEndpoint:
        config?.chatEndpoint ?? process.env.QWEN_CHAT_ENDPOINT ?? "/chat/completions",
      imageEndpoint:
        config?.imageEndpoint ??
        process.env.QWEN_IMAGE_ENDPOINT ??
        "/images/generations",
      timeoutMs: config?.timeoutMs ?? positiveInt(process.env.QWEN_TIMEOUT_MS, 180_000),
    };
  }

  async chatText(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    jsonMode?: boolean;
  }): Promise<string> {
    const url = withBase(this.config.baseUrl, this.config.chatEndpoint);
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
              model: input.model,
              messages: input.messages,
              temperature: input.temperature ?? 0.7,
              response_format: input.jsonMode
                ? { type: "json_object" }
                : undefined,
            }),
            signal: controller.signal,
          }),
        { retries: 2, minDelayMs: 600 },
      );

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`Qwen chat error ${response.status}: ${payload}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Qwen chat response kosong.");
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async chatJson<T>(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<T> {
    const text = await this.chatText({
      ...input,
      jsonMode: true,
      temperature: input.temperature ?? 0.5,
    });

    const rawJson = extractJson(text);
    try {
      return JSON.parse(rawJson) as T;
    } catch (error) {
      throw new Error(`JSON parse gagal: ${(error as Error).message}. raw=${text}`);
    }
  }

  async imageEdit(input: {
    model: string;
    prompt: string;
    referenceImageBase64?: string;
    styleImagesBase64?: string[];
    size?: string;
  }): Promise<Buffer> {
    const baseEndpoint = ensureLeadingSlash(this.config.imageEndpoint);
    const alternateEndpoint =
      baseEndpoint === "/images/generations" ? "/images/edits" : "/images/generations";
    const endpoints = [baseEndpoint, alternateEndpoint];
    const attempted = new Set<string>();
    const errors: string[] = [];

    for (const endpoint of endpoints) {
      if (attempted.has(endpoint)) {
        continue;
      }
      attempted.add(endpoint);
      const url = withBase(this.config.baseUrl, endpoint);
      const response = await retry(
        async () =>
          fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: input.model,
              prompt: input.prompt,
              image: input.referenceImageBase64,
              images: input.styleImagesBase64,
              size: input.size ?? "1024*1024",
              response_format: "b64_json",
            }),
          }),
        { retries: 1, minDelayMs: 900 },
      );

      if (!response.ok) {
        const payload = (await response.text()).slice(0, 300);
        errors.push(`${endpoint} -> ${response.status}${payload ? `: ${payload}` : ""}`);
        // If endpoint not found, try alternate.
        if (response.status === 404) {
          continue;
        }
        // For other statuses, still try alternate endpoint once.
        continue;
      }

      const payload = (await response.json()) as {
        data?: Array<{ b64_json?: string; url?: string }>;
      };

      const first = payload.data?.[0];
      if (!first) {
        errors.push(`${endpoint} -> empty data`);
        continue;
      }

      if (first.b64_json) {
        return Buffer.from(first.b64_json, "base64");
      }

      if (first.url) {
        const imageResponse = await fetch(first.url);
        if (!imageResponse.ok) {
          errors.push(`download url -> ${imageResponse.status}`);
          continue;
        }
        const bytes = await imageResponse.arrayBuffer();
        return Buffer.from(bytes);
      }

      errors.push(`${endpoint} -> data without b64_json/url`);
    }

    throw new Error(`Qwen image error. Tried endpoints: ${errors.join(" | ")}`);
  }
}
