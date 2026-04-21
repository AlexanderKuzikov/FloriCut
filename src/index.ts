import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import { Config } from './types.js';
import { initVlm } from './vlm.js';
import { processAll } from './processor.js';

async function loadConfig(configPath: string): Promise<Config> {
  const raw = await fs.readFile(configPath, 'utf-8');
  return JSON.parse(raw) as Config;
}

program
  .name('floricut')
  .description('Batch crop bouquet photos to target aspect ratio using VLM')
  .option('-c, --config <path>', 'путь к config.json', './config.json')
  .option('-i, --input <dir>',   'входная папка (override config)')
  .option('-o, --output <dir>',  'выходная папка (override config)')
  .option('--dry-run',           'расчёт без записи файлов')
  .option('--force',             'игнорировать skipExisting')
  .parse();

const opts = program.opts();

const configPath = path.resolve(opts.config);
const config     = await loadConfig(configPath);

if (opts.input)  config.inputDir     = opts.input;
if (opts.output) config.outputDir    = opts.output;
if (opts.dryRun) config.dryRun       = true;
if (opts.force)  config.skipExisting = false;

if (!process.env.OPENAI_API_KEY) {
  console.error('Ошибка: OPENAI_API_KEY не задан в .env');
  process.exit(1);
}

const promptPath = path.resolve(path.dirname(configPath), config.promptFile);
config.prompt    = (await fs.readFile(promptPath, 'utf-8')).trim();

console.log(`FloriCut | model: ${config.model} | concurrency: ${config.concurrency}`);
console.log(`input: ${config.inputDir} → output: ${config.outputDir}`);
if (config.dryRun) console.log('[DRY RUN]');

initVlm(config);
await processAll(config);