import { RamadanDinoEngine } from "./engine";
import { RamadanDinoPublicApi } from "./types";

export function createRamadanDinoModule(): RamadanDinoPublicApi {
  return new RamadanDinoEngine();
}
