import { QwenImage20Client } from "./qwen-image-20-client";
import { APP_CONFIG } from "@/lib/app-config";

export class QwenImage20RefineService {
  private readonly client: QwenImage20Client;
  private readonly model: string;

  constructor(client?: QwenImage20Client, model?: string) {
    this.client = client ?? new QwenImage20Client();
    this.model = model ?? APP_CONFIG.qwenImage20.model;
  }

  async refinePanel(input: {
    prompt: string;
    images: string[];
    negativePrompt?: string;
    seed?: number;
    promptExtend?: boolean;
    size?: string;
    trueCfgScale?: number;
    guidanceScale?: number;
    numInferenceSteps?: number;
  }): Promise<Buffer> {
    const images = input.images.filter(Boolean).slice(0, 3);
    if (images.length === 0) {
      throw new Error("Qwen image 2.0 refine butuh minimal 1 gambar input.");
    }

    return this.client.editImage({
      model: this.model,
      prompt: input.prompt,
      images,
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      promptExtend: input.promptExtend,
      size: input.size,
      trueCfgScale: input.trueCfgScale,
      guidanceScale: input.guidanceScale,
      numInferenceSteps: input.numInferenceSteps,
    });
  }
}
