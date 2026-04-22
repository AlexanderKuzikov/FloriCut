import fs from 'fs';
import path from 'path';

function makeLogPath(): string {
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  return path.resolve(`floricut_${ts}.log`);
}

export const logPath = makeLogPath();
const stream = fs.createWriteStream(logPath, { flags: 'w' });

function hms(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function fileId(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).slice(-6);
}

export const logger = {
  vlm:   (file: string, top: number, bottom: number, ms: number) =>
    stream.write(`${hms()} V  ${fileId(file)} ${top} ${bottom} ${ms}\n`),
  ok:    (file: string, cropTop: number, height: number, ms: number) =>
    stream.write(`${hms()} OK ${fileId(file)} ${cropTop} ${height} ${ms}\n`),
  tight: (file: string, bouquetH: number, targetH: number) =>
    stream.write(`${hms()} TI ${fileId(file)} ${bouquetH}>${targetH}\n`),
  skip:  (file: string, reason: string) =>
    stream.write(`${hms()} SK ${fileId(file)} ${reason}\n`),
  error: (fileOrMsg: string, reason?: string) =>
    stream.write(`${hms()} ER ${reason ? fileId(fileOrMsg) : '-'} ${reason ?? fileOrMsg}\n`),
  warn:  (msg: string) =>
    stream.write(`${hms()} WA - ${msg}\n`),
  info:  (msg: string) =>
    stream.write(`${hms()} IN - ${msg}\n`),
};
