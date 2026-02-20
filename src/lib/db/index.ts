let PrismaClientModule: any;
try {
  PrismaClientModule = require("@prisma/client").PrismaClient;
} catch {
  // Prisma client not generated yet — provide a stub so the app can boot
  // for pages that don't need the database (e.g. preview pages).
  PrismaClientModule = null;
}

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

function createPrismaClient() {
  if (!PrismaClientModule) {
    console.warn(
      "[db] @prisma/client not available — run `prisma generate` first. " +
        "Database queries will fail until then."
    );
    // Return a proxy that throws a clear error on any property access / method call
    return new Proxy(
      {},
      {
        get(_, prop) {
          if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) {
            return undefined;
          }
          throw new Error(
            `Prisma client is not available. Run "npx prisma generate" to fix this.`
          );
        },
      }
    );
  }
  return new PrismaClientModule();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
