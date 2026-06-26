import { toSlug } from './utils';

export type ImportedContentSource = 'manual' | 'github_readme' | 'markdown_url';

export interface GitHubRepository {
  owner: string;
  repo: string;
}

export interface ImportedMarkdownContent {
  title?: string;
  slug?: string;
  description?: string | null;
  content: string;
  source: ImportedContentSource;
  sourceUrl: string;
  repoUrl?: string;
  demoUrl?: string | null;
  imageUrl?: string | null;
  categoryNames?: string[];
  status?: 'draft' | 'published';
  isFeatured?: boolean;
  sortOrder?: number;
}

const markdownSizeLimit = 1_500_000;
const githubApiVersion = '2022-11-28';

type FrontmatterValue = string | string[] | number | boolean | null;

function assertMarkdownSize(content: string) {
  if (content.length > markdownSizeLimit) {
    throw new Error('Markdown file is too large. Keep imported content under 1.5 MB.');
  }
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Source URL is required.');

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only http and https URLs are supported.');
    }
    return url;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only http')) throw error;
    throw new Error('Invalid URL. Paste a full URL, for example https://github.com/user/repo.');
  }
}

export function parseGitHubRepoUrl(value: string): GitHubRepository | null {
  if (!value.trim()) return null;

  try {
    const url = normalizeUrl(value);
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);

    if (host === 'github.com' && parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1].replace(/\.git$/i, '')
      };
    }

    if (host === 'raw.githubusercontent.com' && parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1].replace(/\.git$/i, '')
      };
    }

    return null;
  } catch {
    return null;
  }
}

function getGitHubRepoUrl(owner: string, repo: string) {
  return `https://github.com/${owner}/${repo}`;
}

function getGitHubReadmeApiUrl(owner: string, repo: string) {
  return `https://api.github.com/repos/${owner}/${repo}/readme`;
}

function getGitHubRepoApiUrl(owner: string, repo: string) {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

function isExternalUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//');
}

function isAnchorOrRootRelative(value: string) {
  return value.startsWith('#') || value.startsWith('/');
}

function splitMarkdownHref(value: string) {
  const trimmed = value.trim();
  const titleMatch = trimmed.match(/^(\S+)\s+(["'].*["'])$/);
  if (!titleMatch) return { url: trimmed, title: '' };
  return { url: titleMatch[1], title: ` ${titleMatch[2]}` };
}

function resolveReadmeMarkdownUrls(markdown: string, owner: string, repo: string) {
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/HEAD/`;

  return markdown.replace(/(!?\[[^\]]*\]\()([^\)]+)(\))/g, (match, prefix: string, href: string, suffix: string) => {
    const { url, title } = splitMarkdownHref(href);
    if (!url || isExternalUrl(url) || isAnchorOrRootRelative(url)) return match;

    const cleaned = url.replace(/^\.\//, '');
    const resolved = prefix.startsWith('!') ? `${rawBase}${cleaned}` : `${blobBase}${cleaned}`;
    return `${prefix}${resolved}${title}${suffix}`;
  });
}

function unquote(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value: string): FrontmatterValue {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === 'null' || trimmed === '~') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => unquote(item).trim())
      .filter(Boolean);
  }
  return unquote(trimmed);
}

function parseFrontmatter(markdown: string) {
  const normalized = markdown.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {} as Record<string, FrontmatterValue>, content: markdown };

  const data: Record<string, FrontmatterValue> = {};
  const lines = match[1].split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    const key = keyMatch[1].trim();
    const rawValue = keyMatch[2].trim();

    if (!rawValue) {
      const list: string[] = [];
      while (lines[index + 1]?.match(/^\s+-\s+/)) {
        index += 1;
        list.push(unquote(lines[index].replace(/^\s+-\s+/, '')));
      }
      data[key] = list;
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return {
    data,
    content: normalized.slice(match[0].length)
  };
}

function getString(data: Record<string, FrontmatterValue>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function getStringList(data: Record<string, FrontmatterValue>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
    if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function getBoolean(data: Record<string, FrontmatterValue>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      if (['true', 'yes', '1'].includes(normalized)) return true;
      if (['false', 'no', '0'].includes(normalized)) return false;
    }
  }
  return undefined;
}

function getNumber(data: Record<string, FrontmatterValue>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

function getStatus(data: Record<string, FrontmatterValue>): 'draft' | 'published' | undefined {
  const value = getString(data, ['status', 'publish_status']);
  if (value === 'published') return 'published';
  if (value === 'draft') return 'draft';
  return undefined;
}

function metadataFromMarkdown(markdown: string) {
  const { data, content } = parseFrontmatter(markdown);
  return {
    title: getString(data, ['title', 'name']),
    slug: toSlug(getString(data, ['slug']) ?? ''),
    description: getString(data, ['description', 'excerpt', 'summary']),
    imageUrl: getString(data, ['cover_image', 'coverImage', 'image_url', 'imageUrl', 'image', 'thumbnail']),
    demoUrl: getString(data, ['demo_url', 'demoUrl', 'homepage', 'live_url', 'liveUrl']),
    repoUrl: getString(data, ['repo_url', 'repoUrl', 'repository', 'github']),
    categoryNames: getStringList(data, ['categories', 'category', 'tags', 'stack', 'tech_stack']),
    status: getStatus(data),
    isFeatured: getBoolean(data, ['is_featured', 'isFeatured', 'featured']),
    sortOrder: getNumber(data, ['sort_order', 'sortOrder', 'order']),
    content
  };
}

export function extractTitleFromMarkdown(markdown: string) {
  const { title, content } = metadataFromMarkdown(markdown);
  if (title) return title;

  const h1 = content.match(/^#\s+(.+)$/m)?.[1];
  if (h1) return h1.replace(/[#*_`]/g, '').trim();

  const h2 = content.match(/^##\s+(.+)$/m)?.[1];
  if (h2) return h2.replace(/[#*_`]/g, '').trim();

  return undefined;
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Import failed with ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();
  assertMarkdownSize(text);
  return text;
}

async function fetchGitHubRepoMetadata(owner: string, repo: string) {
  const response = await fetch(getGitHubRepoApiUrl(owner, repo), {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': githubApiVersion
    }
  });

  if (!response.ok) return null;

  return (await response.json()) as {
    name?: string;
    full_name?: string;
    description?: string | null;
    html_url?: string;
    homepage?: string | null;
    topics?: string[];
  };
}

export async function fetchGitHubReadmeFromRepo(repoUrl: string): Promise<ImportedMarkdownContent> {
  const repository = parseGitHubRepoUrl(repoUrl);
  if (!repository) {
    throw new Error('Paste a valid GitHub repository URL, for example https://github.com/user/repo.');
  }

  const { owner, repo } = repository;
  const [readme, metadata] = await Promise.all([
    fetchText(getGitHubReadmeApiUrl(owner, repo), {
      headers: {
        Accept: 'application/vnd.github.raw',
        'X-GitHub-Api-Version': githubApiVersion
      }
    }),
    fetchGitHubRepoMetadata(owner, repo)
  ]);

  const content = resolveReadmeMarkdownUrls(readme, owner, repo);
  const frontmatter = metadataFromMarkdown(content);
  const fallbackTitle = repo
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    title: frontmatter.title || extractTitleFromMarkdown(content) || metadata?.name || fallbackTitle,
    slug: frontmatter.slug,
    description: frontmatter.description ?? metadata?.description ?? null,
    content: frontmatter.content,
    source: 'github_readme',
    sourceUrl: getGitHubRepoUrl(owner, repo),
    repoUrl: frontmatter.repoUrl || metadata?.html_url || getGitHubRepoUrl(owner, repo),
    demoUrl: frontmatter.demoUrl || metadata?.homepage || null,
    imageUrl: frontmatter.imageUrl || null,
    categoryNames: frontmatter.categoryNames.length ? frontmatter.categoryNames : metadata?.topics ?? [],
    status: frontmatter.status,
    isFeatured: frontmatter.isFeatured,
    sortOrder: frontmatter.sortOrder
  };
}

export async function fetchMarkdownFromUrl(sourceUrl: string): Promise<ImportedMarkdownContent> {
  const url = normalizeUrl(sourceUrl);
  const rawContent = await fetchText(url.toString(), {
    headers: {
      Accept: 'text/markdown,text/plain,text/*;q=0.9,*/*;q=0.5'
    }
  });
  const frontmatter = metadataFromMarkdown(rawContent);

  return {
    title: frontmatter.title || extractTitleFromMarkdown(rawContent),
    slug: frontmatter.slug,
    description: frontmatter.description ?? null,
    content: frontmatter.content,
    source: 'markdown_url',
    sourceUrl: url.toString(),
    repoUrl: frontmatter.repoUrl,
    demoUrl: frontmatter.demoUrl,
    imageUrl: frontmatter.imageUrl,
    categoryNames: frontmatter.categoryNames,
    status: frontmatter.status,
    isFeatured: frontmatter.isFeatured,
    sortOrder: frontmatter.sortOrder
  };
}

export async function readMarkdownFile(file: File): Promise<ImportedMarkdownContent> {
  const rawContent = await file.text();
  assertMarkdownSize(rawContent);
  const frontmatter = metadataFromMarkdown(rawContent);
  const title = frontmatter.title || extractTitleFromMarkdown(rawContent) || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');

  return {
    title,
    slug: frontmatter.slug,
    description: frontmatter.description ?? null,
    content: frontmatter.content,
    source: 'manual',
    sourceUrl: file.name,
    repoUrl: frontmatter.repoUrl,
    demoUrl: frontmatter.demoUrl,
    imageUrl: frontmatter.imageUrl,
    categoryNames: frontmatter.categoryNames,
    status: frontmatter.status,
    isFeatured: frontmatter.isFeatured,
    sortOrder: frontmatter.sortOrder
  };
}

export function makeSlugFromImportedTitle(title?: string) {
  return title ? toSlug(title) : '';
}
