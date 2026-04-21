import sharp from 'sharp';

export async function getMetadata(filePath: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(filePath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Не удалось получить размеры: ${filePath}`);
  }
  return { width: meta.width, height: meta.height };
}