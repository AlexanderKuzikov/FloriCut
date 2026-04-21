import fs from 'fs';
import path from 'path';

const logPath = path.resolve('floricut.log');
const stream  = fs.createWriteStream(logPath, { flags: 'a' });

function fmt(level: string, msg: string): string {
  return `${new Date().toISOString()} [${level}] ${msg}`;
}

export const logger = {
  info:  (msg: string) => { stream.write(fmt('INFO',  msg) + '\n'); },
  warn:  (msg: string) => { stream.write(fmt('WARN',  msg) + '\n'); },
  error: (msg: string) => { stream.write(fmt('ERROR', msg) + '\n'); },
};