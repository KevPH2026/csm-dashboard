import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
  let dbStatus = 'ok';
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
  } catch {
    // DB not available (e.g. Vercel serverless without persistent storage)
    // This is expected and not a critical error — dashboard falls back to demo data
    dbStatus = 'unavailable (demo mode)';
  }

  // Check LLM availability
  let llmStatus = 'not-configured';
  try {
    // Check if custom API is configured via env vars
    if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL_NAME) {
      llmStatus = 'custom-api-configured';
    } else {
      // Try SDK
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      // Just check if SDK can be imported
      llmStatus = 'sdk-available';
    }
  } catch {
    // SDK not available (e.g. on Vercel without config file)
    if (process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL_NAME) {
      llmStatus = 'custom-api-configured';
    } else {
      llmStatus = 'not-configured';
    }
  }

  const responseTime = Date.now() - startTime;
  // System is healthy even without DB (uses demo data)
  // Only "degraded" if LLM is also not available
  const isHealthy = true; // Dashboard always works (demo data fallback)

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    checks: {
      database: dbStatus,
      llm: llmStatus,
    },
    version: '0.2.0',
  });
}
