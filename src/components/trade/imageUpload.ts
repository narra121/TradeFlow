import { getIdToken } from '@/lib/auth/authService';
import { API_BASE_URL } from '@/lib/api/config';
import { readResponseError } from '@/lib/apiError';

/** A trade holds at most 6 screenshots (create-trade / update-trade). */
export const MAX_IMAGES = 6;
/** What `POST /v1/uploads/images` accepts per object (JournalAWSSetup src/app/uploads/routes.ts). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
/** Source files are redrawn on a canvas, so this only keeps the browser from decoding a huge file. */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIDE = 2000;

/** Splits a pick or drop into the files that can be uploaded and one sentence per problem. */
export function pickScreenshots(files: File[], room: number): { accepted: File[]; problems: string[] } {
  const accepted: File[] = [];
  const problems: string[] = [];
  let overflow = false;
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) problems.push(`${file.name} is not a JPEG, PNG, WebP or GIF image.`);
    else if (file.size > MAX_SOURCE_BYTES) problems.push(`${file.name} is larger than ${MAX_SOURCE_BYTES / (1024 * 1024)} MB.`);
    else if (accepted.length >= room) overflow = true;
    else accepted.push(file);
  }
  if (overflow) problems.push(`A trade can have at most ${MAX_IMAGES} screenshots.`);
  return { accepted, problems };
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The browser could not read that image.'));
    };
    img.src = url;
  });
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

/** Redraws the image on a canvas of at most 2000 px on the long side and encodes it as a JPEG under the 2 MiB upload limit. */
export async function downscale(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  let scale = Math.min(1, MAX_SIDE / longest);
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The browser could not prepare that image.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
    }
    scale *= 0.7;
  }
  throw new Error('That screenshot is too large to upload.');
}

async function presign(blob: Blob): Promise<{ url: string; key: string; headers: Record<string, string> }> {
  const send = async (forceRefresh: boolean) => {
    const token = await getIdToken(forceRefresh ? { forceRefresh: true } : undefined);
    if (!token) throw new Error('Please log in again to upload screenshots.');
    return fetch(`${API_BASE_URL}/uploads/images`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: blob.type, size: blob.size }),
    });
  };
  let res = await send(false);
  if (res.status === 401) res = await send(true);
  if (!res.ok) throw new Error((await readResponseError(res, 'Could not upload the screenshot.')).message);
  const body = await res.json();
  return body.data;
}

/** Downscales the file, uploads it through a presigned URL and resolves to the S3 key a trade then references as an image id. */
export async function uploadScreenshot(file: File): Promise<string> {
  const blob = await downscale(file);
  const { url, key, headers } = await presign(blob);
  const put = await fetch(url, { method: 'PUT', headers, body: blob });
  if (!put.ok) throw new Error('Could not upload the screenshot.');
  return key;
}
