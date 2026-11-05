import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend, apps/web, or repository root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const globalForPrisma = globalThis;

export const userContext = new AsyncLocalStorage();

export const runAsUser = (userId, callback) => userContext.run(userId, callback);
export const currentUserId = () => userContext.getStore();

const withUserScope = {
  query: {
    $allModels: {
      async $allOperations({ model, operation, args = {}, query }) {
        if (model === 'User') return query(args);

        const userId = userContext.getStore();
        if (!userId) throw new Error('Authenticated user context is required for private data');

        if (args.where) args.where = { ...args.where, userId };
        if (operation === 'create') args.data = { ...args.data, userId };
        if (operation === 'createMany') {
          args.data = Array.isArray(args.data)
            ? args.data.map((row) => ({ ...row, userId }))
            : { ...args.data, userId };
        }
        if (operation === 'upsert') {
          args.create = { ...args.create, userId };
          args.where = { ...args.where, userId };
        }

        return query(args);
      },
    },
  },
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  }).$extends(withUserScope);


if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
