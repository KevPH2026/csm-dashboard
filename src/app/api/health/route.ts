import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  // Check database connectivity
  let dbStatus = 'ok';
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = error instanceof Error ? error.message : 'database error';
  }

  // Check LLM SDK availability
  let llmStatus = 'ok';
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    // Just check if SDK can be instantiated, don't make actual API call
    llmStatus = 'sdk-available';
  } catch (error) {
    llmStatus = error instanceof Error ? error.message : 'sdk error';
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = dbStatus === 'ok';

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
  }, {
    status: isHealthy ? 200 : 503,
  });
}
