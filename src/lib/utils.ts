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
