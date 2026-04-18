import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/minimax';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, chatHistory = [], reportContext, skillContext, agentRules } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Save user message to DB
    try {
      await db.chatMessage.create({
        data: { role: 'user', content: message },
      });
    } catch {
      // DB save failed, continue
    }

    // Call AI agent with all context including rules
    const reply = await chatWithAgent(
      message,
      chatHistory,
      reportContext,
      skillContext,
      agentRules
    );

    // Save assistant reply to DB
    try {
      await db.chatMessage.create({
        data: { role: 'assistant', content: reply },
      });
    } catch {
      // DB save failed, continue
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = await db.chatMessage.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    return NextResponse.json({ messages: messages.reverse() });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}
