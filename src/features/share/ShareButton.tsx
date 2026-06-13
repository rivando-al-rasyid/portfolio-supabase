import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { buildShareUrl } from '../../lib/share';
import { trackShareEvent } from '../../lib/contentService';
import type { EntityType, SharePlatform } from '../../types/content';

const platforms: SharePlatform[] = ['linkedin', 'x', 'facebook', 'whatsapp', 'telegram', 'email'];

interface ShareButtonProps {
  entityType: Extract<EntityType, 'blog' | 'project'>;
  entityId: string;
  title: string;
  text?: string;
  url: string;
}

export function ShareButton({ entityType, entityId, title, text = '', url }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function track(platform: string) {
    await trackShareEvent({ entityType, entityId, platform, url, title });
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        await track('native');
        return;
      } catch {
        // User cancelled native share. Show fallback instead.
      }
    }
    setOpen(true);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    await track('copy');
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={handleNativeShare}>
        <Share2 className="h-4 w-4" /> Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Share this page" description="Choose a platform or copy the link.">
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => (
            <Button key={platform} asChild variant="secondary" onClick={() => track(platform)}>
              <a href={buildShareUrl(platform, url, title, text)} target="_blank" rel="noreferrer">
                {platform === 'x' ? 'X / Twitter' : platform[0].toUpperCase() + platform.slice(1)}
              </a>
            </Button>
          ))}
          <Button type="button" variant="outline" className="col-span-2" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
