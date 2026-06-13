import type { SharePlatform } from '../types/content';

export function buildShareUrl(platform: SharePlatform, url: string, title: string, text = '') {
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
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
  }
}

export function renderShareMessage(template: string, values: { title: string; description: string; url: string; type: string }) {
  return template
    .replaceAll('{{title}}', values.title)
    .replaceAll('{{description}}', values.description)
    .replaceAll('{{url}}', values.url)
    .replaceAll('{{type}}', values.type);
}
