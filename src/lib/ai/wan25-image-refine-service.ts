import { Wan25Client } from "./wan25-client";
import { APP_CONFIG } from "@/lib/app-config";

export class Wan25ImageRefineService {
  private readonly client: Wan25Client;
  private readonly model: string;

  constructor(client?: Wan25Client) {
    this.client = client ?? new Wan25Client();
    this.model = APP_CONFIG.wan25.model;
  }

  async refinePanel(input: {
    prompt: string;
    images: string[];
    negativePrompt?: string;
    seed?: number;
    promptExtend?: boolean;
  }): Promise<Buffer> {
    return this.client.refineImage({
      model: this.model,
      prompt: input.prompt,
      images: input.images.slice(0, 3),
      negativePrompt: input.negativePrompt,
      seed: input.seed,
      promptExtend: input.promptExtend,
    });
  }
}
