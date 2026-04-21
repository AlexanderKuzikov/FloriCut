import fs from 'fs/promises';
import path from 'path';
import cliProgress from 'cli-progress';
import { Config, ProcessResult } from './types.js';
import { getBounds } from './vlm.js';
import { calcCrop, cropAndSave } from './cropper.js';
import { getMetadata } from './utils.js';
import { logger } from './logger.js';
import { initLimiter } from './limiter.js';
import { Stats } from './stats.js';

export async function processAll(config: Config): Promise<void> {
  const files = (await fs.readdir(config.inputDir))
    .filter(f => f.toLowerCase().endsWith('.webp'));

  if (!files.length) {
    logger.warn('Нет WebP файлов в inputDir.');
    return;
  }

  await fs.mkdir(config.outputDir, { recursive: true });
  await fs.mkdir(config.errorDir,  { recursive: true });

  initLimiter(config);

  const total = files.length;
  const stats = new Stats();

  const multibar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    forceRedraw: false,
  }, cliProgress.Presets.shades_classic);

  const bar = multibar.create(total, 0, {
    ok: 0, skip: 0, err: 0,
  }, {
    format: '{bar} {percentage}% | {value}/{total} | ok:{ok} skip:{skip} err:{err}',
  });

  const statsBar = multibar.create(1, 0, {}, {
    format:            '  rpm:{rpm}/{rpmLimit} | avg:{avg}ms | p95:{p95}ms | speed:{speed}/min | eta:{eta} | elapsed:{elapsed} | err:{errPct}%',
    barsize:           0,
    barCompleteChar:   '',
    barIncompleteChar: '',
  });

  const statsInterval = setInterval(() => {
    const processed = stats.ok + stats.skip + stats.err;
    const remaining = total - processed;
    statsBar.update(0, {
      rpm:      stats.rpm,
      rpmLimit: config.requestsPerMinute,
      avg:      stats.avgLatency,
      p95:      stats.p95Latency,
      speed:    stats.speedPerMin(),
      eta:      stats.eta(remaining),
      elapsed:  stats.elapsedStr,
      errPct:   stats.errPct(processed),
    });
  }, 1000);

  const tasks  = files.map(file => processOne(file, config, stats, bar));
  const results: ProcessResult[] = await Promise.all(tasks);

  clearInterval(statsInterval);
  multibar.stop();

  results
    .filter(r => r.status === 'error')
    .forEach(r => logger.error(`${r.file}: ${(r as any).reason}`));

  const summary = `Готово: ok=${stats.ok} skip=${stats.skip} err=${stats.err}`;
  logger.info(summary);
  process.stdout.write(summary + '\n');
}

async function processOne(
  file: string,
  config: Config,
  statsObj: Stats,
  bar: cliProgress.SingleBar
): Promise<ProcessResult> {
  const inputPath  = path.join(config.inputDir,  file);
  const outputPath = path.join(config.outputDir, file);
  const errorPath  = path.join(config.errorDir,  file);

  try {
    if (config.skipExisting) {
      try {
        await fs.access(outputPath);
        logger.info(`skip (exists): ${file}`);
        statsObj.skip++;
        bar.increment(1, { ok: statsObj.ok, skip: statsObj.skip, err: statsObj.err });
        return { status: 'skip', file, reason: 'exists' };
      } catch {}
    }

    const { width: imgW, height: imgH } = await getMetadata(inputPath);
    const { bounds, latencyMs }         = await getBounds(inputPath, config);
    const crop                          = calcCrop(imgW, imgH, bounds, config);

    statsObj.record(latencyMs);

    if (!crop) {
      const reason = `imgH(${imgH}) <= targetH, no crop needed`;
      logger.info(`skip: ${file} — ${reason}`);
      statsObj.skip++;
      bar.increment(1, { ok: statsObj.ok, skip: statsObj.skip, err: statsObj.err });
      return { status: 'skip', file, reason };
    }

    if (!config.dryRun) {
      await cropAndSave(inputPath, outputPath, crop, config);
    }

    logger.info(`ok: ${file} — crop top=${crop.top} height=${crop.height} latency=${latencyMs}ms`);
    statsObj.ok++;
    bar.increment(1, { ok: statsObj.ok, skip: statsObj.skip, err: statsObj.err });
    return { status: 'ok', file, latencyMs };

  } catch (e: any) {
    const reason = e?.message ?? String(e);
    logger.error(`${file}: ${reason}`);
    if (!config.dryRun) {
      await fs.copyFile(inputPath, errorPath).catch(() => {});
    }
    statsObj.err++;
    bar.increment(1, { ok: statsObj.ok, skip: statsObj.skip, err: statsObj.err });
    return { status: 'error', file, reason };
  }
}