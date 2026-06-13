import type { ReactNode } from 'react';

const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;

function isSafeUrl(value: string) {
  const url = value.trim();
  if (!url) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function safeUrl(value: string) {
  const url = value.trim();
  return isSafeUrl(url) ? url : '#';
}

function getYouTubeId(value: string) {
  const input = value.trim();
  if (youtubeIdPattern.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname.includes('youtube.com')) {
      const videoId = url.searchParams.get('v');
      if (videoId && youtubeIdPattern.test(videoId)) return videoId;
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch?.[1]) return shortsMatch[1];
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch?.[1]) return embedMatch[1];
    }
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '').split('/')[0];
      if (youtubeIdPattern.test(id)) return id;
    }
  } catch {
    return null;
  }

  return null;
}

function createYouTubeEmbed(value: string, key: string | number) {
  const id = getYouTubeId(value);
  if (!id) return null;

  return (
    <figure key={key} className="cms-embed cms-youtube">
      <div className="cms-embed-frame">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </figure>
  );
}

function createAudioEmbed(value: string, key: string | number) {
  const url = safeUrl(value);
  if (url === '#') return null;

  return (
    <figure key={key} className="cms-embed cms-audio">
      <audio controls preload="metadata" src={url}>
        Your browser does not support the audio element.
      </audio>
    </figure>
  );
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]?.startsWith('![')) {
      const alt = match[2] ?? '';
      const url = safeUrl(match[3] ?? '');
      const title = match[4];
      nodes.push(<img key={nodes.length} src={url} alt={alt} title={title} loading="lazy" />);
    } else if (match[5] && match[6]) {
      const href = safeUrl(match[6]);
      const isExternal = href.startsWith('http');
      nodes.push(
        <a key={nodes.length} href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer' : undefined}>
          {match[5]}
        </a>
      );
    } else if (match[7]) {
      nodes.push(<code key={nodes.length}>{match[7]}</code>);
    } else if (match[8]) {
      nodes.push(<strong key={nodes.length}>{match[8]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={nodes.length}>{match[9]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function isImageLine(line: string) {
  return /^!\[[^\]]*\]\([^)]+\)$/.test(line.trim());
}

function renderImageLine(line: string, key: string | number) {
  const match = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
  if (!match) return null;
  const alt = match[1] ?? '';
  const url = safeUrl(match[2] ?? '');
  const caption = match[3];
  return (
    <figure key={key} className="cms-image">
      <img src={url} alt={alt} title={caption} loading="lazy" />
      {caption || alt ? <figcaption>{caption || alt}</figcaption> : null}
    </figure>
  );
}

export function renderMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];
  let quoteLines: string[] = [];
  let codeLines: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';

  function flushUnordered() {
    if (!unorderedItems.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`}>
        {unorderedItems.map((item, index) => (
          <li key={index}>{parseInline(item)}</li>
        ))}
      </ul>
    );
    unorderedItems = [];
  }

  function flushOrdered() {
    if (!orderedItems.length) return;
    nodes.push(
      <ol key={`ol-${nodes.length}`}>
        {orderedItems.map((item, index) => (
          <li key={index}>{parseInline(item)}</li>
        ))}
      </ol>
    );
    orderedItems = [];
  }

  function flushQuotes() {
    if (!quoteLines.length) return;
    nodes.push(
      <blockquote key={`quote-${nodes.length}`}>
        {quoteLines.map((item, index) => (
          <p key={index}>{parseInline(item)}</p>
        ))}
      </blockquote>
    );
    quoteLines = [];
  }

  function flushListsAndQuotes() {
    flushUnordered();
    flushOrdered();
    flushQuotes();
  }

  function flushCodeBlock() {
    nodes.push(
      <pre key={`code-${nodes.length}`} data-language={codeLanguage || undefined}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
    codeLines = [];
    codeLanguage = '';
  }

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCodeBlock();
      } else {
        flushListsAndQuotes();
        inCodeBlock = true;
        codeLanguage = line.replace('```', '').trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    if (!line) {
      flushListsAndQuotes();
      return;
    }

    const youtubeDirective = line.match(/^::youtube\s+(.+)$/i) ?? line.match(/^\{\{youtube:(.+)\}\}$/i);
    if (youtubeDirective?.[1]) {
      flushListsAndQuotes();
      const embed = createYouTubeEmbed(youtubeDirective[1], `youtube-${index}`);
      nodes.push(embed ?? <p key={index}>{parseInline(line)}</p>);
      return;
    }

    const audioDirective = line.match(/^::audio\s+(.+)$/i) ?? line.match(/^\{\{audio:(.+)\}\}$/i);
    if (audioDirective?.[1]) {
      flushListsAndQuotes();
      const embed = createAudioEmbed(audioDirective[1], `audio-${index}`);
      nodes.push(embed ?? <p key={index}>{parseInline(line)}</p>);
      return;
    }

    const youtubePlain = getYouTubeId(line);
    if (youtubePlain) {
      flushListsAndQuotes();
      nodes.push(createYouTubeEmbed(line, `youtube-${index}`));
      return;
    }

    if (isImageLine(line)) {
      flushListsAndQuotes();
      nodes.push(renderImageLine(line, `image-${index}`));
      return;
    }

    if (/^---+$/.test(line)) {
      flushListsAndQuotes();
      nodes.push(<hr key={`hr-${index}`} />);
      return;
    }

    if (line.startsWith('#### ')) {
      flushListsAndQuotes();
      nodes.push(<h4 key={index}>{parseInline(line.replace(/^####\s+/, ''))}</h4>);
      return;
    }

    if (line.startsWith('### ')) {
      flushListsAndQuotes();
      nodes.push(<h3 key={index}>{parseInline(line.replace(/^###\s+/, ''))}</h3>);
      return;
    }

    if (line.startsWith('## ')) {
      flushListsAndQuotes();
      nodes.push(<h2 key={index}>{parseInline(line.replace(/^##\s+/, ''))}</h2>);
      return;
    }

    if (line.startsWith('# ')) {
      flushListsAndQuotes();
      nodes.push(<h1 key={index}>{parseInline(line.replace(/^#\s+/, ''))}</h1>);
      return;
    }

    if (line.startsWith('> ')) {
      flushUnordered();
      flushOrdered();
      quoteLines.push(line.replace(/^>\s+/, ''));
      return;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered?.[1]) {
      flushOrdered();
      flushQuotes();
      unorderedItems.push(unordered[1]);
      return;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered?.[1]) {
      flushUnordered();
      flushQuotes();
      orderedItems.push(ordered[1]);
      return;
    }

    flushListsAndQuotes();
    nodes.push(<p key={index}>{parseInline(line)}</p>);
  });

  if (inCodeBlock) flushCodeBlock();
  flushListsAndQuotes();
  return nodes.filter(Boolean);
}
