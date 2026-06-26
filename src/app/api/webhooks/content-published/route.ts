import { NextRequest, NextResponse } from 'next/server';
import { enqueuePublishedContent } from '../../../../lib/socialShareServer';

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.SOCIAL_SHARE_WEBHOOK_SECRET;
  if (!configuredSecret) return true;

  const headerSecret = request.headers.get('x-webhook-secret');
  const bearerSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return headerSecret === configuredSecret || bearerSecret === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await enqueuePublishedContent(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Webhook failed.' }, { status: 500 });
  }
}
