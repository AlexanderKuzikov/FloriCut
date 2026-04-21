import OpenAI from 'openai';
import sharp from 'sharp';
import { Config, VlmBounds } from './types.js';
import { logger } from './logger.js';
import { withLimit } from './limiter.js';

let client: OpenAI;
let config_: Config;

export function initVlm(config: Config): void {
  config_ = config;
  client  = new OpenAI({
    apiKey:  process.env.OPENAI_API_KEY!,
    baseURL: config.baseURL,
  });
}

async function toBase64(
  imagePath: string,
  resizeWidth: number
): Promise<{ base64: string; resizedHeight: number }> {
  const buf = await sharp(imagePath)
    .resize({ width: resizeWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const meta = await sharp(buf).metadata();

  return {
    base64: buf.toString('base64'),
    resizedHeight: meta.height!,
  };
}

export async function getBounds(
  imagePath: string,
  config: Config
): Promise<{ bounds: VlmBounds; latencyMs: number }> {
  const { base64, resizedHeight } = await toBase64(imagePath, config.vlmResizeWidth);

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

    logger.info(`VLM raw [${imagePath}]: ${raw} (resizedHeight=${resizedHeight}, ${latencyMs}ms)`);

    return { bounds: parseBounds(raw, resizedHeight), latencyMs };
  };

  return withLimit(requestFn, config.retryAttempts, config.retryBaseDelayMs);
}

function parseBounds(raw: string, resizedHeight: number): VlmBounds {
  const numbers = [...raw.matchAll(/\d+/g)].map(m => Number(m[0]));

  if (numbers.length < 2) {
    throw new Error(`cannot extract two numbers from: ${raw}`);
  }

  let topPx: number;
  let bottomPx: number;

  if (numbers.length >= 4) {
    topPx    = numbers[1];
    bottomPx = numbers[3];
  } else {
    topPx    = numbers[0];
    bottomPx = numbers[1];
  }

  topPx    = Math.max(0, Math.min(topPx,    resizedHeight));
  bottomPx = Math.max(0, Math.min(bottomPx, resizedHeight));

  if (bottomPx <= topPx) {
    throw new Error(`invalid bounds top=${topPx} bottom=${bottomPx} (resizedHeight=${resizedHeight})`);
  }

  return {
    top:    Math.round((topPx    / resizedHeight) * 100),
    bottom: Math.round((bottomPx / resizedHeight) * 100),
  };
}