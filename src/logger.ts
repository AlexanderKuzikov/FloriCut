import fs from 'fs';
import path from 'path';

const logPath   = path.resolve('floricut.log');
const tightPath = path.resolve('tight.log');

const logStream   = fs.createWriteStream(logPath,   { flags: 'a' });
const tightStream = fs.createWriteStream(tightPath, { flags: 'a' });

function fmt(level: string, msg: string): string {
  return `${new Date().toISOString()} [${level}] ${msg}`;
}

export const logger = {
  info:  (msg: string) => { logStream.write(fmt('INFO',  msg) + '\n'); },
  warn:  (msg: string) => { logStream.write(fmt('WARN',  msg) + '\n'); },
  error: (msg: string) => { logStream.write(fmt('ERROR', msg) + '\n'); },
  tight: (file: string, reason: string) => {
    tightStream.write(`${file}\t${reason}\n`);
    logStream.write(fmt('TIGHT', `${file} — ${reason}`) + '\n');
  },
};