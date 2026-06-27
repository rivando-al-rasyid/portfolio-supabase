import type { SharePlatform } from '../types/content';

export function buildShareUrl(platform: Exclude<SharePlatform, 'instagram'>, url: string, title: string, text = '') {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text || title);

  switch (platform) {
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case 'x':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
}

export function renderShareMessage(template: string, values: { title: string; description: string; url: string; type: string }) {
  return template
    .replaceAll('{{title}}', values.title)
    .replaceAll('{{description}}', values.description)
    .replaceAll('{{url}}', values.url)
    .replaceAll('{{type}}', values.type);
}
