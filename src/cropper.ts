import sharp from 'sharp';
import { Config, VlmBounds, CropRect } from './types.js';

export type CropResult =
  | { ok: true;  crop: CropRect }
  | { ok: false; tight: false; reason: string }
  | { ok: false; tight: true;  bouquetH: number; targetH: number; reason: string };

export function calcCrop(
  imgW: number,
  imgH: number,
  bounds: VlmBounds,
  config: Config
): CropResult {
  const { w, h } = config.targetAspectRatio;
  const targetH  = Math.round(imgW * (h / w));

  if (imgH <= targetH) {
    return { ok: false, tight: false, reason: `imgH(${imgH})<=targetH(${targetH})` };
  }

  const topPx    = (bounds.top    / 100) * imgH;
  const bottomPx = (bounds.bottom / 100) * imgH;
  const bouquetH = Math.round(bottomPx - topPx);

  if (bouquetH > targetH * config.tightThreshold) {
    return { ok: false, tight: true, bouquetH, targetH, reason: `bouquet ${bouquetH}px > targetH(${targetH})*${config.tightThreshold}` };
  }

  const topPaddingPx = Math.round(targetH * config.topPadding);

  // Шаг 1: якорим по верху букета с отступом
  let cropTop = Math.round(topPx - topPaddingPx);

  // Шаг 2: если низ букета не влезает — двигаем вверх ровно на нужное
  if (bottomPx > cropTop + targetH) {
    cropTop = Math.round(bottomPx - targetH);
  }

  // Шаг 3: не уходим выше 0
  cropTop = Math.max(0, cropTop);

  // Шаг 4: если даже при cropTop=0 низ не влезает — физический tight
  if (cropTop + targetH > imgH) {
    return { ok: false, tight: true, bouquetH, targetH, reason: `bottom=${Math.round(bottomPx)} не влезает в imgH=${imgH}` };
  }

  return { ok: true, crop: { top: cropTop, height: targetH, width: imgW } };
}

export async function cropAndSave(
  inputPath: string,
  outputPath: string,
  crop: CropRect,
  config: Config
): Promise<void> {
  await sharp(inputPath)
    .extract({ left: 0, top: crop.top, width: crop.width, height: crop.height })
    .webp({ quality: config.outputQuality })
    .toFile(outputPath);
}
