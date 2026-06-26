import { toSlug } from './utils';

export type ImportedContentSource = 'manual' | 'github_readme' | 'markdown_url';

export interface GitHubRepository {
  owner: string;
  repo: string;
}

export interface ImportedMarkdownContent {
  title?: string;
  description?: string | null;
  content: string;
  source: ImportedContentSource;
  sourceUrl: string;
  repoUrl?: string;
  demoUrl?: string | null;
}

const markdownSizeLimit = 1_500_000;
const githubApiVersion = '2022-11-28';

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

export function extractTitleFromMarkdown(markdown: string) {
  const h1 = markdown.match(/^#\s+(.+)$/m)?.[1];
  if (h1) return h1.replace(/[#*_`]/g, '').trim();

  const h2 = markdown.match(/^##\s+(.+)$/m)?.[1];
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
  const fallbackTitle = repo
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return {
    title: extractTitleFromMarkdown(content) || metadata?.name || fallbackTitle,
    description: metadata?.description ?? null,
    content,
    source: 'github_readme',
    sourceUrl: getGitHubRepoUrl(owner, repo),
    repoUrl: metadata?.html_url || getGitHubRepoUrl(owner, repo),
    demoUrl: metadata?.homepage || null
  };
}

export async function fetchMarkdownFromUrl(sourceUrl: string): Promise<ImportedMarkdownContent> {
  const url = normalizeUrl(sourceUrl);
  const content = await fetchText(url.toString(), {
    headers: {
      Accept: 'text/markdown,text/plain,text/*;q=0.9,*/*;q=0.5'
    }
  });

  return {
    title: extractTitleFromMarkdown(content),
    description: null,
    content,
    source: 'markdown_url',
    sourceUrl: url.toString()
  };
}

export async function readMarkdownFile(file: File): Promise<ImportedMarkdownContent> {
  const content = await file.text();
  assertMarkdownSize(content);
  const title = extractTitleFromMarkdown(content) || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');

  return {
    title,
    description: null,
    content,
    source: 'manual',
    sourceUrl: file.name
  };
}

export function makeSlugFromImportedTitle(title?: string) {
  return title ? toSlug(title) : '';
}
