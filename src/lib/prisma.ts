import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: isDev
    ? [{ level: 'query', emit: 'event' }, 'info', 'warn', 'error']
    : ['warn', 'error'],
});

if (isDev) {
  (prisma as any).$on('query', (e: any) => {
    try {
      let sql = e.query as string;
      const params: any[] = JSON.parse(e.params);
      params.forEach((val, i) => {
        const replacement = typeof val === 'string' ? `'${val}'` : String(val);
        sql = sql.replace(`$${i + 1}`, replacement);
      });
      console.log(`prisma:query ${sql}  [${e.duration}ms]`);
    } catch {
      console.log(`prisma:query ${e.query}  [${e.duration}ms]  params=${e.params}`);
    }
  });

  global.prisma = prisma;
}

export default prisma;
