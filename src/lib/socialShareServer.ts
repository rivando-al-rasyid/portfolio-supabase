import { createServiceClient } from './supabase-server';
import { getSiteUrl } from './utils';
import type { SharePlatform, SocialApiConnection, SocialShareQueueItem } from '../types/content';

interface ProcessOptions {
  limit?: number;
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

async function readError(response: Response) {
  const body = await response.text().catch(() => '');
  return body ? `${response.status}: ${body}` : String(response.status);
}

function requireValue(value: string | null | undefined, label: string) {
  if (!value?.trim()) throw new Error(`${label} is missing.`);
  return value.trim();
}

async function postTelegram(connection: SocialApiConnection, message: string) {
  const botToken = requireValue(connection.api_token, 'Telegram bot token');
  const chatId = requireValue(connection.account_id, 'Telegram chat ID');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: false
    })
  });

  if (!response.ok) throw new Error(`Telegram returned ${await readError(response)}`);
}

async function postX(connection: SocialApiConnection, message: string) {
  const token = requireValue(connection.api_token, 'X access token');
  const response = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ text: message.slice(0, 280) })
  });

  if (!response.ok) throw new Error(`X returned ${await readError(response)}`);
}

async function postFacebook(connection: SocialApiConnection, message: string) {
  const pageId = requireValue(connection.account_id, 'Facebook Page ID');
  const token = requireValue(connection.api_token, 'Facebook Page access token');
  const form = new URLSearchParams({ message, access_token: token });

  const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    body: form
  });

  if (!response.ok) throw new Error(`Facebook returned ${await readError(response)}`);
}

async function postLinkedIn(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const author = requireValue(connection.account_id, 'LinkedIn author URN');
  const token = requireValue(connection.api_token, 'LinkedIn access token');
  const payload = asRecord(item.payload);
  const url = String(payload.url ?? '');

  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: message },
        shareMediaCategory: url ? 'ARTICLE' : 'NONE',
        media: url
          ? [
              {
                status: 'READY',
                originalUrl: url,
                title: { text: String(payload.title ?? 'New post') }
              }
            ]
          : []
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-restli-protocol-version': '2.0.0'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`LinkedIn returned ${await readError(response)}`);
}

async function postWhatsApp(connection: SocialApiConnection, message: string) {
  const phoneNumberId = requireValue(connection.account_id, 'WhatsApp phone number ID');
  const recipientNumber = requireValue(connection.api_code, 'WhatsApp recipient number');
  const token = requireValue(connection.api_token, 'WhatsApp access token');

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientNumber,
      type: 'text',
      text: {
        preview_url: true,
        body: message
      }
    })
  });

  if (!response.ok) throw new Error(`WhatsApp returned ${await readError(response)}`);
}

async function postEmail(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const apiKey = requireValue(connection.api_token, 'Resend API key');
  const to = requireValue(connection.account_id, 'recipient email');
  const from = connection.api_code?.trim() || process.env.SOCIAL_SHARE_EMAIL_FROM || 'Portfolio <onboarding@resend.dev>';
  const payload = asRecord(item.payload);
  const subject = `New ${String(payload.type ?? 'content')}: ${String(payload.title ?? 'Portfolio update')}`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: message
    })
  });

  if (!response.ok) throw new Error(`Email provider returned ${await readError(response)}`);
}

async function postToPlatform(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  if (connection.platform === 'telegram') return postTelegram(connection, message);
  if (connection.platform === 'x') return postX(connection, message);
  if (connection.platform === 'facebook') return postFacebook(connection, message);
  if (connection.platform === 'linkedin') return postLinkedIn(connection, item, message);
  if (connection.platform === 'whatsapp') return postWhatsApp(connection, message);
  if (connection.platform === 'email') return postEmail(connection, item, message);

  throw new Error(`Unsupported platform: ${connection.platform}`);
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
