import sharp from 'sharp';
import { Config, VlmBounds, CropRect } from './types.js';

export type CropResult =
  | { ok: true;  crop: CropRect }
  | { ok: false; reason: string; tight: boolean };

export function calcCrop(
  imgW: number,
  imgH: number,
  bounds: VlmBounds,
  config: Config
): CropResult {
  const { w, h } = config.targetAspectRatio;
  const targetH  = Math.round(imgW * (h / w));

  if (imgH <= targetH) {
    return { ok: false, tight: false, reason: `imgH(${imgH}) <= targetH(${targetH}), skip` };
  }

  const topPx    = (bounds.top    / 100) * imgH;
  const bottomPx = (bounds.bottom / 100) * imgH;
  const bouquetH = bottomPx - topPx;

  if (bouquetH > targetH * config.tightThreshold) {
    return {
      ok: false,
      tight: true,
      reason: `bouquet ${Math.round(bouquetH)}px > targetH(${targetH}) * threshold(${config.tightThreshold})`,
    };
  }

  const topPaddingPx = Math.round(targetH * config.topPadding);

  // Шаг 1: якорим по верху букета с отступом сверху
  let cropTop = Math.round(topPx - topPaddingPx);

  // Шаг 2: если низ букета вылезает из кадра — сдвигаем cropTop вверх
  if (bottomPx > cropTop + targetH) {
    cropTop = Math.round(bottomPx - targetH);
  }

  // Шаг 3: не уходим за границы кадра
  cropTop = Math.max(0, Math.min(cropTop, imgH - targetH));

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