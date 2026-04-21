export interface AspectRatio {
  w: number;
  h: number;
}

export interface Config {
  baseURL: string;
  model: string;
  targetAspectRatio: AspectRatio;
  tightThreshold: number;
  topPadding: number;
  vlmResizeWidth: number;
  concurrency: number;
  requestsPerMinute: number;
  retryAttempts: number;
  retryBaseDelayMs: number;
  outputFormat: 'webp';
  outputQuality: number;
  skipExisting: boolean;
  dryRun: boolean;
  inputDir: string;
  outputDir: string;
  errorDir: string;
  promptFile: string;
  prompt?: string;
  enableThinking: boolean;
}

export interface VlmBounds {
  top: number;
  bottom: number;
}

export interface CropRect {
  top: number;
  height: number;
  width: number;
}

export type ProcessResult =
  | { status: 'ok';    file: string; latencyMs: number }
  | { status: 'skip';  file: string; reason: string }
  | { status: 'tight'; file: string; reason: string }
  | { status: 'error'; file: string; reason: string };