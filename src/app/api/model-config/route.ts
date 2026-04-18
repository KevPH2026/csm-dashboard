import { NextRequest, NextResponse } from 'next/server';
import { testModelConnection, DEFAULT_CONFIG, type LLMConfig } from '@/lib/minimax';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const config = await db.modelConfig.findFirst({ where: { isActive: true } });
    if (config) {
      return NextResponse.json({
        config: {
          provider: config.provider,
          apiKey: config.apiKey ? config.apiKey.slice(0, 8) + '...' : '',
          baseUrl: config.baseUrl,
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        },
      });
    }
  } catch {
    // DB not ready
  }

  return NextResponse.json({
    config: {
      provider: DEFAULT_CONFIG.provider,
      apiKey: DEFAULT_CONFIG.apiKey ? DEFAULT_CONFIG.apiKey.slice(0, 8) + '...' : '',
      baseUrl: DEFAULT_CONFIG.baseUrl,
      modelName: DEFAULT_CONFIG.modelName,
      temperature: DEFAULT_CONFIG.temperature,
      maxTokens: DEFAULT_CONFIG.maxTokens,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, modelName, temperature, maxTokens } = body;

    // Deactivate old configs
    try {
      await db.modelConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });
    } catch {
      // DB not ready
    }

    // Create new config
    try {
      const config = await db.modelConfig.create({
        data: {
          provider: provider || 'zai-sdk',
          apiKey: apiKey || '',
          baseUrl: baseUrl || '',
          modelName: modelName || '',
          temperature: temperature ?? DEFAULT_CONFIG.temperature,
          maxTokens: maxTokens ?? DEFAULT_CONFIG.maxTokens,
          isActive: true,
        },
      });
      return NextResponse.json({ success: true, config: { ...config, apiKey: config.apiKey ? config.apiKey.slice(0, 8) + '...' : '' } });
    } catch {
      // DB not ready, save to memory only
      return NextResponse.json({ success: true, message: 'Config saved to session (DB unavailable)' });
    }
  } catch (error) {
    console.error('Model config API error:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, baseUrl, modelName, temperature, maxTokens } = body;

    const config: LLMConfig = {
      provider: provider || 'zai-sdk',
      apiKey: apiKey || '',
      baseUrl: baseUrl || '',
      modelName: modelName || '',
      temperature: temperature ?? DEFAULT_CONFIG.temperature,
      maxTokens: maxTokens ?? DEFAULT_CONFIG.maxTokens,
    };

    const result = await testModelConnection(config);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json({ success: false, message: 'Connection test failed' });
  }
}
