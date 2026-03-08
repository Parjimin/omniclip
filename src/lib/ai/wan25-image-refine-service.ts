import { Wan25Client } from "./wan25-client";

export class Wan25ImageRefineService {
  private readonly client: Wan25Client;
  private readonly model: string;

  constructor(client?: Wan25Client) {
    this.client = client ?? new Wan25Client();
    this.model = process.env.WAN25_MODEL ?? "wan2.5-i2i-preview";
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
