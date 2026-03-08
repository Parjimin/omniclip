import { QwenImage20Client } from "./qwen-image-20-client";

export class QwenImage20GenerateService {
  private readonly client: QwenImage20Client;
  private readonly model: string;

  constructor(client?: QwenImage20Client, model?: string) {
    this.client = client ?? new QwenImage20Client();
    this.model = model ?? process.env.QWEN_IMAGE_BASE_MODEL ?? "qwen-image-2.0-pro";
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
      size: process.env.QWEN_IMAGE_BASE_SIZE ?? process.env.QWEN_IMAGE_REFINER_SIZE ?? "1024*1536",
    });
  }
}
