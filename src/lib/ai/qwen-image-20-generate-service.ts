import { QwenImage20Client } from "./qwen-image-20-client";
import { APP_CONFIG } from "@/lib/app-config";

export class QwenImage20GenerateService {
  private readonly client: QwenImage20Client;
  private readonly model: string;

  constructor(client?: QwenImage20Client, model?: string) {
    this.client = client ?? new QwenImage20Client();
    this.model = model ?? APP_CONFIG.qwenImage20.model;
  }

  async generatePanel(input: {
    prompt: string;
    userPhotoDataUrl?: string;
    continuityImageDataUrl?: string;
    styleImageDataUrls?: string[];
    guideImageDataUrls?: string[];
    negativePrompt?: string;
    seed?: number;
    promptExtend?: boolean;
  }): Promise<Buffer> {
    const images = [
      input.continuityImageDataUrl ?? input.userPhotoDataUrl,
      ...(input.guideImageDataUrls ?? []),
      ...(input.styleImageDataUrls ?? []),
    ]
      .filter(Boolean)
      .slice(0, 3) as string[];

    if (images.length === 0) {
      throw new Error("Qwen image 2.0 base generation butuh minimal 1 gambar referensi.");
    }

    return this.client.editImage({
      model: this.model,
      prompt: input.prompt,
      images,
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      promptExtend: input.promptExtend,
      size: APP_CONFIG.qwenImage20.size,
    });
  }
}
