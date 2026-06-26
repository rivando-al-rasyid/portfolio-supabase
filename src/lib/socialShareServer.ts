import { createServiceClient } from './supabase-server';
import { getSiteUrl } from './utils';
import type { SharePlatform, SocialApiConnection, SocialShareQueueItem } from '../types/content';

interface ProcessOptions {
  limit?: number;
}

interface WebhookPayload {
  platform: SharePlatform;
  message: string;
  accountId: string | null;
  payload: Record<string, unknown>;
  queueId: string;
  entityType: string;
  entityId: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function renderTemplate(template: string, payload: Record<string, unknown>) {
  const categories = Array.isArray(payload.categories) ? payload.categories.join(', ') : String(payload.categories ?? '');
  const values: Record<string, string> = {
    title: String(payload.title ?? ''),
    description: String(payload.description ?? ''),
    url: String(payload.url ?? ''),
    type: String(payload.type ?? ''),
    categories
  };

  return template.replace(/{{\s*(title|description|url|type|categories)\s*}}/g, (_, key: string) => values[key] ?? '').trim();
}

async function postToPlatform(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const payload = asRecord(item.payload);

  if (connection.platform === 'telegram') {
    if (!connection.api_token) throw new Error('Telegram bot token is missing.');
    if (!connection.account_id) throw new Error('Telegram chat ID is missing.');

    const response = await fetch(`https://api.telegram.org/bot${connection.api_token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: connection.account_id,
        text: message,
        disable_web_page_preview: false
      })
    });

    if (!response.ok) throw new Error(`Telegram returned ${response.status}: ${await response.text()}`);
    return;
  }

  if (!connection.api_base_url) {
    throw new Error('Webhook / posting endpoint is missing for this platform.');
  }

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (connection.api_token) headers.authorization = `Bearer ${connection.api_token}`;
  if (connection.api_code) headers['x-api-code'] = connection.api_code;
  if (connection.api_secret) headers['x-api-secret'] = connection.api_secret;

  const body: WebhookPayload = {
    platform: connection.platform,
    message,
    accountId: connection.account_id,
    payload,
    queueId: item.id,
    entityType: item.entity_type,
    entityId: item.entity_id
  };

  const response = await fetch(connection.api_base_url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
}

export async function processSocialShareQueue({ limit = 10 }: ProcessOptions = {}) {
  const supabase = createServiceClient();
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);

  const { data: settings } = await supabase.from('social_share_settings').select('*').eq('id', 'default').maybeSingle();
  const template = settings?.default_message_template || 'New {{type}}: {{title}} {{url}}';

  const { data: queue, error: queueError } = await supabase
    .from('social_share_queue')
    .select('*')
    .in('status', ['pending', 'ready'])
    .lte('scheduled_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(safeLimit);

  if (queueError) throw queueError;

  const jobs = (queue ?? []) as SocialShareQueueItem[];
  const results: Array<{ id: string; platform: SharePlatform; status: 'sent' | 'failed'; error?: string }> = [];

  for (const item of jobs) {
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('social_api_connections')
        .select('*')
        .eq('platform', item.platform)
        .eq('is_enabled', true)
        .maybeSingle();

      if (connectionError) throw connectionError;
      if (!connection) throw new Error(`No enabled API connection for ${item.platform}.`);

      const payload = asRecord(item.payload);
      const message = renderTemplate(template, payload);
      await postToPlatform(connection as SocialApiConnection, item, message);

      const { error: updateError } = await supabase
        .from('social_share_queue')
        .update({
          status: 'sent',
          attempts: item.attempts + 1,
          sent_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', item.id);

      if (updateError) throw updateError;
      results.push({ id: item.id, platform: item.platform, status: 'sent' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processor error.';
      await supabase
        .from('social_share_queue')
        .update({
          status: 'failed',
          attempts: item.attempts + 1,
          error_message: message
        })
        .eq('id', item.id);
      results.push({ id: item.id, platform: item.platform, status: 'failed', error: message });
    }
  }

  return {
    processed: results.length,
    sent: results.filter((item) => item.status === 'sent').length,
    failed: results.filter((item) => item.status === 'failed').length,
    results
  };
}

function normalizePublishedPayload(body: Record<string, unknown>) {
  const record = asRecord(body.record) || body;
  const table = String(body.table ?? body.entity_type ?? record.entity_type ?? '');
  const entityType = table.includes('project') ? 'project' : 'blog';
  const slug = String(record.slug ?? body.slug ?? '');
  const title = String(record.title ?? body.title ?? 'Untitled');
  const description = String(record.excerpt ?? record.summary ?? body.description ?? '');
  const entityId = String(record.id ?? body.entity_id ?? body.id ?? '');
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const url = String(body.url ?? `${getSiteUrl()}/${entityType === 'blog' ? 'blog' : 'projects'}/${slug}`);

  return { entityType, entityId, title, description, slug, categories, url };
}

export async function enqueuePublishedContent(body: Record<string, unknown>) {
  const supabase = createServiceClient();
  const normalized = normalizePublishedPayload(body);

  if (!normalized.entityId || !normalized.slug) {
    throw new Error('Webhook payload needs an id/entity_id and slug.');
  }

  const status = String(asRecord(body.record).status ?? body.status ?? 'published');
  if (status !== 'published') {
    return { queued: 0, skipped: 'Content is not published.' };
  }

  const { data: settings, error: settingsError } = await supabase.from('social_share_settings').select('*').eq('id', 'default').maybeSingle();
  if (settingsError) throw settingsError;

  const platforms = ((settings?.active_platforms as SharePlatform[] | undefined) ?? []) as SharePlatform[];
  if (!settings?.auto_share_on_publish || platforms.length === 0) {
    return { queued: 0, skipped: 'Auto-share is disabled or no platforms are active.' };
  }

  const rows = platforms.map((platform) => ({
    entity_type: normalized.entityType,
    entity_id: normalized.entityId,
    platform,
    status: 'ready',
    payload: {
      title: normalized.title,
      description: normalized.description,
      url: normalized.url,
      type: normalized.entityType,
      categories: normalized.categories
    },
    scheduled_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('social_share_queue').insert(rows);
  if (error) throw error;

  return { queued: rows.length, platforms };
}
