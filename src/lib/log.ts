// src/lib/log.ts
import pino            from 'pino';
import { multistream } from 'pino';
import path            from 'path';
import fs              from 'fs';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) 
{
    fs.mkdirSync(logsDir, { recursive: true });
}

const prettyLogPath = path.join(logsDir, 'cc.log');       // Pretty human-readable
const jsonLogPath = path.join(logsDir, 'cc.json.log');    // Raw JSON

const isDev = process.env.NODE_ENV !== 'production';

const streams: pino.StreamEntry[] = [];

// Always write raw JSON to file
streams.push(
{
    level: 'info',
    stream: pino.destination(
    {
        dest: jsonLogPath,
        sync: false,
        mkdir: true,
    }),
});

if (isDev) 
{
    const { default: pretty } = await import('pino-pretty');
    
    const prettyOptions = 
    {
        colorize      : true,
        translateTime : 'HH:MM:ss Z',
        ignore        : 'pid,hostname',
        singleLine    : true,
    };

    // Pretty to console
    streams.push(
    {
        level   : 'debug',
        stream  : pretty(prettyOptions),
    });

    // Pretty to file.
    streams.push(
    {
        level: 'debug',
        stream: pretty(
        {
            ...prettyOptions,
            destination: prettyLogPath,
        }),
    });
}

export const log = pino(
  {
      level: isDev ? 'debug' : 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
  },
  multistream(streams)
);