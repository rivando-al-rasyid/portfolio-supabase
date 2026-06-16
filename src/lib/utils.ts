import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null) {
  if (!value) return 'Draft';
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
}

export function truncateText(value: string | null | undefined, max = 140) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function stripMarkdown(value: string | null | undefined) {
  if (!value) return '';

  return normalizeWhitespace(
    value
      // Remove custom embed directives but keep the URL text out of the SEO description.
      .replace(/^::(youtube|audio)\s+.*$/gim, '')
      // Keep image alt text, remove image URL.
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Keep link text, remove link URL.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Remove fenced and inline code markers.
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove common Markdown marks.
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/[\*_~|]/g, '')
      .replace(/<[^>]+>/g, '')
  );
}

export function generateSeoTitle(title: string, maxLength = 60) {
  const cleanTitle = normalizeWhitespace(title || 'Untitled');
  return truncateText(cleanTitle, maxLength);
}

export function generateSeoDescription(input: { description?: string | null; content?: string | null }, maxLength = 155) {
  const source = stripMarkdown(input.description) || stripMarkdown(input.content) || 'Read this portfolio content.';
  return truncateText(source, maxLength);
}

export function toSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function makeUniqueSlug(baseValue: string, existingSlugs: string[], currentSlug?: string) {
  const baseSlug = toSlug(baseValue) || 'untitled';
  const current = currentSlug ? toSlug(currentSlug) : '';
  const used = new Set(existingSlugs.map((slug) => toSlug(slug)).filter((slug) => slug && slug !== current));

  if (!used.has(baseSlug)) return baseSlug;

  let counter = 2;
  let nextSlug = `${baseSlug}-${counter}`;
  while (used.has(nextSlug)) {
    counter += 1;
    nextSlug = `${baseSlug}-${counter}`;
  }

  return nextSlug;
}

export function getSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
}

export function getCanonicalUrl(path: string) {
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
