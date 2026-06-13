import { supabase } from './supabase';
import { compressImageFile } from './imageCompression';
import { toSlug } from './utils';

const MEDIA_BUCKET = 'portfolio-media';

function buildMediaPath(file: File, extension: string, folder = 'cms') {
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const safeName = toSlug(originalName) || 'image';
  const date = new Date().toISOString().slice(0, 10);
  return `${folder}/${date}/${Date.now()}-${safeName}.${extension}`;
}

export async function compressAndUploadImage(file: File, folder?: string) {
  const compressed = await compressImageFile(file);
  const path = buildMediaPath(file, compressed.extension, folder);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, compressed.blob, {
    cacheControl: '31536000',
    contentType: compressed.mimeType,
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    ...compressed
  };
}
