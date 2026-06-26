// Supabase Edge Function: process-social-share
// Deploy with: supabase functions deploy process-social-share
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: SHARE_PROCESSOR_TOKEN if you want to protect manual HTTP calls.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.0';

type SharePlatform = 'linkedin' | 'x' | 'facebook' | 'whatsapp' | 'telegram' | 'email';

type QueueItem = {
  id: string;
  entity_type: 'blog' | 'project';
  entity_id: string;
  platform: SharePlatform;
  payload: Record<string, unknown>;
  attempts: number;
};

type ApiConnection = {
  platform: SharePlatform;
  is_enabled: boolean;
  api_base_url: string | null;
  api_code: string | null;
  api_token: string | null;
  api_secret: string | null;
  account_id: string | null;
  extra_config: Record<string, unknown> | null;
};

type ShareSettings = {
  default_message_template: string;
};

function corsResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-share-processor-token',
      'access-control-allow-methods': 'POST, OPTIONS'
    }
  });
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function formatMessage(template: string, payload: Record<string, unknown>) {
  const categories = Array.isArray(payload.categories) ? payload.categories.join(', ') : '';
  return template
    .replaceAll('{{title}}', asString(payload.title))
    .replaceAll('{{description}}', asString(payload.description))
    .replaceAll('{{url}}', asString(payload.url))
    .replaceAll('{{type}}', asString(payload.type))
    .replaceAll('{{categories}}', categories);
}

async function postTelegram(connection: ApiConnection, text: string) {
  if (!connection.api_token || !connection.account_id) {
    throw new Error('Telegram needs api_token as bot token and account_id as chat id.');
  }

  const response = await fetch(`https://api.telegram.org/bot${connection.api_token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: connection.account_id, text, disable_web_page_preview: false })
  });

  if (!response.ok) throw new Error(`Telegram API failed: ${response.status} ${await response.text()}`);
}

async function postToConfiguredEndpoint(connection: ApiConnection, item: QueueItem, text: string) {
  if (!connection.api_base_url) {
    throw new Error(`${connection.platform} needs api_base_url. Use a custom backend, Zapier/Make/n8n webhook, or a provider endpoint.`);
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (connection.api_token) headers.authorization = `Bearer ${connection.api_token}`;
  if (connection.api_code) headers['x-api-code'] = connection.api_code;
  if (connection.api_secret) headers['x-api-secret'] = connection.api_secret;

  const response = await fetch(connection.api_base_url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      platform: connection.platform,
      account_id: connection.account_id,
      text,
      title: item.payload.title,
      description: item.payload.description,
      url: item.payload.url,
      type: item.payload.type,
      categories: item.payload.categories,
      extra_config: connection.extra_config ?? {}
    })
  });

  if (!response.ok) throw new Error(`${connection.platform} API failed: ${response.status} ${await response.text()}`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return corsResponse({ ok: true });
  if (request.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

  const processorToken = Deno.env.get('SHARE_PROCESSOR_TOKEN');
  if (processorToken && request.headers.get('x-share-processor-token') !== processorToken) {
    return corsResponse({ error: 'Unauthorized processor token.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return corsResponse({ error: 'Missing Supabase service role env.' }, 500);

  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit ?? 10), 25);
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: settings } = await supabase
    .from('social_share_settings')
    .select('default_message_template')
    .eq('id', 'default')
    .maybeSingle<ShareSettings>();

  const template = settings?.default_message_template || 'New {{type}}: {{title}} {{url}}';

  const { data: queue, error: queueError } = await supabase
    .from('social_share_queue')
    .select('*')
    .eq('status', 'ready')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (queueError) return corsResponse({ error: queueError.message }, 500);

  let processed = 0;
  let failed = 0;

  for (const item of (queue ?? []) as QueueItem[]) {
    const { data: connection, error: connectionError } = await supabase
      .from('social_api_connections')
      .select('*')
      .eq('platform', item.platform)
      .eq('is_enabled', true)
      .maybeSingle<ApiConnection>();

    if (connectionError || !connection) {
      failed += 1;
      await supabase
        .from('social_share_queue')
        .update({ status: 'failed', attempts: item.attempts + 1, error_message: connectionError?.message || 'No enabled API connection for platform.' })
        .eq('id', item.id);
      continue;
    }

    const text = formatMessage(template, item.payload);

    try {
      if (connection.platform === 'telegram') {
        await postTelegram(connection, text);
      } else {
        await postToConfiguredEndpoint(connection, item, text);
      }

      await supabase
        .from('social_share_queue')
        .update({ status: 'sent', attempts: item.attempts + 1, sent_at: new Date().toISOString(), error_message: null })
        .eq('id', item.id);

      await supabase.from('share_events').insert({
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        platform: item.platform,
        url: asString(item.payload.url),
        title: asString(item.payload.title)
      });

      processed += 1;
    } catch (error) {
      failed += 1;
      await supabase
        .from('social_share_queue')
        .update({ status: 'failed', attempts: item.attempts + 1, error_message: error instanceof Error ? error.message : 'Unknown share error' })
        .eq('id', item.id);
    }
  }

  return corsResponse({ processed, failed, total: queue?.length ?? 0 });
});
