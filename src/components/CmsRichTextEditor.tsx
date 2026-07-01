'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { renderMarkdown } from '../lib/markdown';
import { formatBytes } from '../lib/imageCompression';
import { compressAndUploadImage } from '../lib/mediaService';

type EditorMode = 'write' | 'preview';

interface CmsRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  uploadFolder: string;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
}

const starterTemplate = `## Section title

Write your paragraph here with **bold text**, *italic text*, and [links](https://example.com).

- Bullet point one
- Bullet point two

::youtube https://youtu.be/dQw4w9WgXcQ

::audio https://example.com/audio.mp3`;

export function CmsRichTextEditor({ value, onChange, uploadFolder, onMessage, onError }: CmsRichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<EditorMode>('write');
  const [isUploading, setIsUploading] = useState(false);

  function focusAfterInsert(start: number, end: number) {
    window.setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start, end);
    }, 0);
  }

  function insertText(snippet: string, selectStart?: number, selectEnd?: number) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${snippet}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    focusAfterInsert(start + (selectStart ?? snippet.length), start + (selectEnd ?? snippet.length));
  }

  function wrapSelection(before: string, after = before, fallback = 'text') {
    const textarea = textareaRef.current;
    if (!textarea) return insertText(`${before}${fallback}${after}`);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const snippet = `${before}${selected}${after}`;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    focusAfterInsert(start + before.length, start + before.length + selected.length);
  }

  function addLink() {
    const url = window.prompt('Paste URL');
    if (!url) return;
    wrapSelection('[', `](${url})`, 'link text');
  }

  function addImageUrl() {
    const url = window.prompt('Paste image URL');
    if (!url) return;
    const alt = window.prompt('Image alt text') || 'Image';
    insertText(`\n![${alt}](${url})\n`);
  }

  function addYouTube() {
    const url = window.prompt('Paste YouTube URL or video ID');
    if (!url) return;
    insertText(`\n::youtube ${url}\n`);
  }

  function addAudio() {
    const url = window.prompt('Paste audio file URL, for example .mp3 or .wav');
    if (!url) return;
    insertText(`\n::audio ${url}\n`);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setIsUploading(true);
      const result = await compressAndUploadImage(file, uploadFolder);
      const alt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') || 'Image';
      insertText(`\n![${alt}](${result.url})\n`);
      onMessage?.(`Content image compressed from ${formatBytes(result.originalBytes)} to ${formatBytes(result.compressedBytes)} and inserted.`);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Content image upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2">
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => insertText('\n## Heading\n', 4, 11)}>H2</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertText('\n### Heading\n', 5, 12)}>H3</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => wrapSelection('**', '**', 'bold text')}>Bold</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => wrapSelection('*', '*', 'italic text')}>Italic</Button>
          <Button type="button" size="sm" variant="ghost" onClick={addLink}>Link</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertText('\n- List item\n', 3, 12)}>List</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => insertText('\n> Quote text\n', 3, 13)}>Quote</Button>
          <Button type="button" size="sm" variant="ghost" onClick={addImageUrl}>Image URL</Button>
          <Button type="button" size="sm" variant="ghost" onClick={addYouTube}>YouTube</Button>
          <Button type="button" size="sm" variant="ghost" onClick={addAudio}>Audio</Button>
          <Button type="button" size="sm" variant="outline" disabled={isUploading} asChild>
            <label className="cursor-pointer">
              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload image
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            </label>
          </Button>
        </div>
        <div className="flex gap-1 rounded-md bg-muted p-1">
          <Button type="button" size="sm" variant={mode === 'write' ? 'secondary' : 'ghost'} onClick={() => setMode('write')}>Write</Button>
          <Button type="button" size="sm" variant={mode === 'preview' ? 'secondary' : 'ghost'} onClick={() => setMode('preview')}>Preview</Button>
        </div>
      </div>

      {mode === 'write' ? (
        <Textarea
          ref={textareaRef}
          className="min-h-[420px] rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={starterTemplate}
        />
      ) : (
        <div className="markdown-body min-h-[420px] p-4">{value.trim() ? renderMarkdown(value) : <p>Preview will appear here.</p>}</div>
      )}

      <div className="border-t bg-muted/40 p-3 text-xs text-muted-foreground">
        Supports Markdown plus CMS embeds: <code>**bold**</code>, <code>![alt](image-url)</code>, <code>::youtube URL</code>, and <code>::audio URL</code>.
      </div>
    </div>
  );
}
