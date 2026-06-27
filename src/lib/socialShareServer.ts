import { createServiceClient } from './supabase-server';
import { getSiteUrl, truncateText } from './utils';
import type { SharePlatform, SocialApiConnection, SocialShareQueueItem } from '../types/content';

interface ProcessOptions {
  limit?: number;
}

const SUPPORTED_AUTO_SHARE_PLATFORMS: SharePlatform[] = ['facebook', 'instagram', 'linkedin', 'x'];
const META_GRAPH_VERSION = process.env.SOCIAL_SHARE_META_GRAPH_VERSION || 'v22.0';
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

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

function getPayloadText(item: SocialShareQueueItem, key: string) {
  const payload = asRecord(item.payload);
  return String(payload[key] ?? '').trim();
}

function appendUrl(message: string, url: string) {
  if (!url) return message;
  if (message.includes(url)) return message;
  return `${message}\n\n${url}`.trim();
}

async function postX(connection: SocialApiConnection, message: string) {
  const token = requireValue(connection.api_token, 'X user access token with tweet.write scope');

  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ text: truncateText(message, 280) })
  });

  if (!response.ok) throw new Error(`X returned ${await readError(response)}`);
}

async function postFacebook(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const pageId = requireValue(connection.account_id, 'Facebook Page ID');
  const token = requireValue(connection.api_token, 'Facebook Page access token');
  const url = getPayloadText(item, 'url');

  const body: Record<string, string | boolean> = {
    message,
    published: true
  };
  if (url) body.link = url;

  const response = await fetch(`${META_GRAPH_BASE_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) throw new Error(`Facebook returned ${await readError(response)}`);
}

async function postInstagram(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const igUserId = requireValue(connection.account_id, 'Instagram Business IG User ID');
  const token = requireValue(connection.api_token, 'Instagram Graph API access token');
  const imageUrl = getPayloadText(item, 'image_url') || getPayloadText(item, 'cover_image');
  const contentUrl = getPayloadText(item, 'url');

  if (!imageUrl) {
    throw new Error('Instagram publishing needs a public image URL. Add a blog cover image or project image before publishing.');
  }

  const caption = truncateText(appendUrl(message, contentUrl), 2200);

  const createContainerResponse = await fetch(`${META_GRAPH_BASE_URL}/${igUserId}/media`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      image_url: imageUrl,
      caption
    })
  });

  if (!createContainerResponse.ok) {
    throw new Error(`Instagram media container returned ${await readError(createContainerResponse)}`);
  }

  const container = (await createContainerResponse.json()) as { id?: string };
  const creationId = requireValue(container.id, 'Instagram media container ID');

  await waitForInstagramContainer(creationId, token);

  const publishResponse = await fetch(`${META_GRAPH_BASE_URL}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ creation_id: creationId })
  });

  if (!publishResponse.ok) {
    throw new Error(`Instagram media publish returned ${await readError(publishResponse)}`);
  }
}

async function waitForInstagramContainer(containerId: string, token: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`${META_GRAPH_BASE_URL}/${containerId}?fields=status_code`, {
      headers: { authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Instagram container status returned ${await readError(response)}`);
    }

    const body = (await response.json()) as { status_code?: string };
    if (body.status_code === 'FINISHED') return;
    if (body.status_code === 'ERROR' || body.status_code === 'EXPIRED') {
      throw new Error(`Instagram container is ${body.status_code}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function postLinkedIn(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  const author = requireValue(connection.account_id, 'LinkedIn Person URN');
  const token = requireValue(connection.api_token, 'LinkedIn access token with w_member_social scope');
  const config = asRecord(connection.extra_config);
  const expiresAt = config.expires_at ? Date.parse(String(config.expires_at)) : 0;
  if (expiresAt && Date.now() > expiresAt - 60_000) {
    throw new Error('LinkedIn access token expired. Reconnect LinkedIn from Auto-share settings.');
  }

  const payload = asRecord(item.payload);
  const url = String(payload.url ?? '').trim();
  const title = String(payload.title ?? 'New post');
  const description = String(payload.description ?? '');

  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: message },
    shareMediaCategory: url ? 'ARTICLE' : 'NONE'
  };

  if (url) {
    shareContent.media = [
      {
        status: 'READY',
        originalUrl: url,
        title: { text: title },
        ...(description ? { description: { text: description } } : {})
      }
    ];
  }

  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': shareContent
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

async function postToPlatform(connection: SocialApiConnection, item: SocialShareQueueItem, message: string) {
  if (connection.platform === 'facebook') return postFacebook(connection, item, message);
  if (connection.platform === 'instagram') return postInstagram(connection, item, message);
  if (connection.platform === 'linkedin') return postLinkedIn(connection, item, message);
  if (connection.platform === 'x') return postX(connection, message);

  throw new Error(`Unsupported auto-share platform: ${connection.platform}`);
}

export async function processSocialShareQueue({ limit = 10 }: ProcessOptions = {}) {
  const supabase = createServiceClient();
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);

  const { data: settings } = await supabase.from('social_share_settings').select('*').eq('id', 'default').maybeSingle();
  const template = settings?.default_message_template || 'New {{type}}: {{title}} {{url}}';

  const { data: queue, error: queueError } = await supabase
    .from('social_share_queue')
    .select('*')
    .in('platform', SUPPORTED_AUTO_SHARE_PLATFORMS)
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
  const imageUrl = String(record.cover_image ?? record.image_url ?? body.image_url ?? body.cover_image ?? '');
  const url = String(body.url ?? `${getSiteUrl()}/${entityType === 'blog' ? 'blog' : 'projects'}/${slug}`);

  return { entityType, entityId, title, description, slug, categories, url, imageUrl };
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

  const platforms = ((settings?.active_platforms as SharePlatform[] | undefined) ?? []).filter((platform) =>
    SUPPORTED_AUTO_SHARE_PLATFORMS.includes(platform)
  );
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
      image_url: normalized.imageUrl,
      type: normalized.entityType,
      categories: normalized.categories
    },
    scheduled_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('social_share_queue').insert(rows);
  if (error) throw error;

  return { queued: rows.length, platforms };
}
