import sharp from 'sharp';
import { Config, VlmBounds, CropRect } from './types.js';

export function calcCrop(
  imgW: number,
  imgH: number,
  bounds: VlmBounds,
  config: Config
): CropRect | null {
  const { w, h } = config.targetAspectRatio;
  const targetH = Math.round(imgW * (h / w));

  if (imgH <= targetH) return null;

  const topPx    = (bounds.top / 100) * imgH;
  const bottomPx = (bounds.bottom / 100) * imgH;
  const centerY  = (topPx + bottomPx) / 2;

  let cropTop = Math.round(centerY - targetH / 2);
  cropTop = Math.max(0, Math.min(cropTop, imgH - targetH));

  return { top: cropTop, height: targetH, width: imgW };
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