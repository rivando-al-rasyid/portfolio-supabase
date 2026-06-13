export interface CompressedImageResult {
  blob: Blob;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  mimeType: string;
  extension: 'webp' | 'jpg';
}

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: 'image/webp' | 'image/jpeg';
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Cannot read the selected image.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Image compression failed.'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function compressImageFile(file: File, options: CompressionOptions = {}): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file.');
  }

  const maxWidth = options.maxWidth ?? 1600;
  const maxHeight = options.maxHeight ?? 1200;
  const quality = options.quality ?? 0.78;
  const outputType = options.outputType ?? 'image/webp';
  const image = await loadImage(file);

  const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser canvas is not available.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, outputType, quality);
  let mimeType = outputType;
  let extension: 'webp' | 'jpg' = outputType === 'image/webp' ? 'webp' : 'jpg';

  // Some browsers can silently fall back to PNG if WebP is not supported.
  if (outputType === 'image/webp' && blob.type !== 'image/webp') {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    mimeType = 'image/jpeg';
    extension = 'jpg';
  }

  return {
    blob,
    originalBytes: file.size,
    compressedBytes: blob.size,
    width,
    height,
    mimeType,
    extension
  };
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
