import { WanImageClient } from "./wan-client";
import { APP_CONFIG } from "@/lib/app-config";

export class WanImageService {
  private readonly client: WanImageClient;
  private readonly model: string;

  constructor(client?: WanImageClient) {
    this.client = client ?? new WanImageClient();
    this.model = APP_CONFIG.wan.model;
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
    const images: string[] = [];

    for (const guideImage of input.guideImageDataUrls ?? []) {
      if (images.length >= 4) {
        break;
      }
      images.push(guideImage);
    }

    if (input.userPhotoDataUrl && images.length < 4) {
      images.push(input.userPhotoDataUrl);
    }

    if (input.continuityImageDataUrl && images.length < 4) {
      images.push(input.continuityImageDataUrl);
    }

    for (const styleImage of input.styleImageDataUrls ?? []) {
      if (images.length >= 4) {
        break;
      }
      images.push(styleImage);
    }

    return this.client.generateImage({
      model: this.model,
      prompt: input.prompt,
      imageDataUrls: images,
      negativePrompt: input.negativePrompt,
      size: APP_CONFIG.wan.size,
      seed: input.seed,
      promptExtend: input.promptExtend,
    });
  }
}
