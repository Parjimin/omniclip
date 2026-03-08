import { ASSET_MANIFEST } from "./constants";

export interface LoadedAssets {
  background: HTMLImageElement;
  baseIdle: HTMLImageElement;
  left: HTMLImageElement;
  right: HTMLImageElement;
  jump: HTMLImageElement;
  bodyDown: HTMLImageElement;
  bedug: HTMLImageElement;
  kurma: HTMLImageElement;
  lentera: HTMLImageElement;
  ketupat: HTMLImageElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Gagal load asset: ${url}`));
    image.src = url;
  });
}

export async function loadAssets(basePath = "/game-assets"): Promise<LoadedAssets> {
  const prefix = basePath.replace(/\/$/, "");
  return {
    background: await loadImage(`${prefix}/${ASSET_MANIFEST.background}`),
    baseIdle: await loadImage(`${prefix}/${ASSET_MANIFEST.baseIdle}`),
    left: await loadImage(`${prefix}/${ASSET_MANIFEST.left}`),
    right: await loadImage(`${prefix}/${ASSET_MANIFEST.right}`),
    jump: await loadImage(`${prefix}/${ASSET_MANIFEST.jump}`),
    bodyDown: await loadImage(`${prefix}/${ASSET_MANIFEST.bodyDown}`),
    bedug: await loadImage(`${prefix}/${ASSET_MANIFEST.bedug}`),
    kurma: await loadImage(`${prefix}/${ASSET_MANIFEST.kurma}`),
    lentera: await loadImage(`${prefix}/${ASSET_MANIFEST.lentera}`),
    ketupat: await loadImage(`${prefix}/${ASSET_MANIFEST.ketupat}`),
  };
}
