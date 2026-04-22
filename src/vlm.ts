import OpenAI from 'openai';
import sharp from 'sharp';
import { Config, VlmBounds } from './types.js';
import { logger } from './logger.js';
import { withLimit } from './limiter.js';

const VLM_HEIGHT = 1000;

let client: OpenAI;

export function initVlm(config: Config): void {
  client = new OpenAI({
    apiKey:  process.env.OPENAI_API_KEY!,
    baseURL: config.baseURL,
  });
}

async function toBase64(imagePath: string): Promise<string> {
  const buf = await sharp(imagePath)
    .resize({ height: VLM_HEIGHT, withoutEnlargement: false })
    .webp({ quality: 80 })
    .toBuffer();
  return buf.toString('base64');
}

export async function getBounds(
  imagePath: string,
  config: Config
): Promise<{ bounds: VlmBounds; latencyMs: number }> {
  const base64 = await toBase64(imagePath);

  const requestFn = async () => {
    const t0 = Date.now();

    const requestParams: any = {
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/webp;base64,${base64}` } },
            { type: 'text', text: config.prompt! },
          ],
        },
      ],
      max_tokens: 64,
      temperature: 0,
    };

    if (!config.enableThinking) {
      requestParams.extra_body = { enable_thinking: false };
    }

    const response  = await client.chat.completions.create(requestParams);
    const latencyMs = Date.now() - t0;
    const raw       = response.choices[0]?.message?.content ?? '';
    const bounds    = parseBounds(raw);

    logger.vlm(imagePath, bounds.top, bounds.bottom, latencyMs);

    return { bounds, latencyMs };
  };

  return withLimit(requestFn, config.retryAttempts, config.retryBaseDelayMs);
}

function parseBounds(raw: string): VlmBounds {
  let topPx: number;
  let bottomPx: number;

  const jsonMatch = raw.match(/\{[^}]+\}/);
  if (jsonMatch) {
    let parsed: any;
    try {
      parsed   = JSON.parse(jsonMatch[0]);
      topPx    = Number(parsed.top);
      bottomPx = Number(parsed.bottom);
    } catch {
      const numbers = [...jsonMatch[0].matchAll(/\d+/g)].map(m => Number(m[0]));
      if (numbers.length < 2) throw new Error(`cannot parse bounds: ${raw}`);
      topPx    = numbers[0];
      bottomPx = numbers[1];
    }
  } else {
    const numbers = [...raw.matchAll(/\d+/g)].map(m => Number(m[0]));
    if (numbers.length < 2) throw new Error(`cannot parse bounds: ${raw}`);
    topPx    = numbers[0];
    bottomPx = numbers[1];
  }

  if (!Number.isFinite(topPx!) || !Number.isFinite(bottomPx!)) {
    throw new Error(`non-numeric bounds: ${raw}`);
  }

  const top    = Math.max(0, Math.min(topPx!,    VLM_HEIGHT));
  const bottom = Math.max(0, Math.min(bottomPx!, VLM_HEIGHT));

  if (bottom <= top) throw new Error(`invalid bounds top=${top} bottom=${bottom}`);

  return {
    top:    Math.round((top    / VLM_HEIGHT) * 100),
    bottom: Math.round((bottom / VLM_HEIGHT) * 100),
  };
}
