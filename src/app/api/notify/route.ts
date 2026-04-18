import { NextRequest, NextResponse } from 'next/server';
import { sendReportNotification } from '@/lib/wechat-work';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekLabel, summary } = body;

    const success = await sendReportNotification(
      weekLabel || '本周',
      summary || 'CSM周报已生成，请登录系统查看完整报告。'
    );

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Notify API error:', error);
    return NextResponse.json({ error: 'Failed to send notification', success: false }, { status: 500 });
  }
}
