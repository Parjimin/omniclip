import { QwenClient } from "./qwen-client";
import { APP_CONFIG } from "@/lib/app-config";

function stripDataUrlPrefix(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match?.[1] ?? value;
}

export class QwenImageEditService {
  private readonly client: QwenClient;
  private readonly model: string;

  constructor(client?: QwenClient) {
    this.client = client ?? new QwenClient();
    this.model = APP_CONFIG.qwen.imageEditModel;
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
    const userPhotoBase64 = stripDataUrlPrefix(input.userPhotoDataUrl);
    const styleImagesBase64 = [
      input.continuityImageDataUrl,
      ...(input.styleImageDataUrls ?? []),
    ]
      .map((image) => stripDataUrlPrefix(image))
      .filter((image): image is string => Boolean(image));

    return this.client.imageEdit({
      model: this.model,
      prompt: input.prompt,
      referenceImageBase64: userPhotoBase64,
      styleImagesBase64,
      size: "1024*1024",
    });
  }
}
