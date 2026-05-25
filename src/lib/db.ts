import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is set before creating PrismaClient
// On Vercel/serverless without DATABASE_URL, we create a dummy client
// that gracefully fails on any query (all API routes already catch DB errors)
function createPrismaClient(): PrismaClient {
  // If DATABASE_URL is not set, provide a fallback so Prisma doesn't crash on import
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./db/fallback.db'
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
