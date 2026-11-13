import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ getIdToken: vi.fn() }));
vi.mock('@/lib/auth/authService', () => auth);
vi.mock('@/lib/api/config', () => ({ API_BASE_URL: 'https://api.test.com/v1' }));

import { MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES, pickScreenshots, uploadScreenshot } from '../imageUpload';

const file = (name: string, type: string, size = 10) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('pickScreenshots (FE-013)', () => {
  it('takes JPEG, PNG, WebP and GIF and names every file it skips', () => {
    const { accepted, problems } = pickScreenshots([file('a.png', 'image/png'), file('b.heic', 'image/heic'), file('c.svg', 'image/svg+xml'), file('d.gif', 'image/gif')], 6);
    expect(accepted.map((f) => f.name)).toEqual(['a.png', 'd.gif']);
    expect(problems).toEqual(['b.heic is not a JPEG, PNG, WebP or GIF image.', 'c.svg is not a JPEG, PNG, WebP or GIF image.']);
  });

  it('rejects a file that is too large to decode', () => {
    const { accepted, problems } = pickScreenshots([file('big.png', 'image/png', MAX_SOURCE_BYTES + 1)], 6);
    expect(accepted).toEqual([]);
    expect(problems[0]).toMatch(/big\.png is larger than 20 MB/);
  });

  it('stops at the room left and says so once', () => {
    const { accepted, problems } = pickScreenshots([file('1.png', 'image/png'), file('2.png', 'image/png'), file('3.png', 'image/png')], 1);
    expect(accepted.map((f) => f.name)).toEqual(['1.png']);
    expect(problems).toEqual(['A trade can have at most 6 screenshots.']);
  });
});

describe('uploadScreenshot (X-003)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    auth.getIdToken.mockResolvedValue('tok');
    fetchMock.mockReset();
    // jsdom decodes no images and draws no canvas: stand in for both.
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 4000;
        naturalHeight = 2000;
        onload: (() => void) | null = null;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('downscales, asks for a presigned URL with the real size, PUTs the bytes and returns the key', async () => {
    const widths: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb) {
      widths.push(this.width);
      cb(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }));
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { url: 'https://s3.test/put?sig=1', key: 'images/u1/upload/a.jpg', headers: { 'Content-Type': 'image/jpeg' } } }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const key = await uploadScreenshot(file('chart.png', 'image/png', 9_000_000));

    expect(key).toBe('images/u1/upload/a.jpg');
    expect(widths).toEqual([2000]);
    const [presignUrl, presignInit] = fetchMock.mock.calls[0];
    expect(presignUrl).toBe('https://api.test.com/v1/uploads/images');
    expect(presignInit.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(presignInit.body)).toEqual({ contentType: 'image/jpeg', size: 'jpeg-bytes'.length });
    const [putUrl, putInit] = fetchMock.mock.calls[1];
    expect(putUrl).toBe('https://s3.test/put?sig=1');
    expect(putInit).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });
    expect(putInit.body).toBeInstanceOf(Blob);
  });

  it('lowers the quality, then the size, until the image fits the 2 MiB limit', async () => {
    const attempts: number[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, cb, _type, quality) {
      attempts.push(quality as number);
      cb(new Blob([new Uint8Array(attempts.length < 4 ? MAX_UPLOAD_BYTES + 1 : 100)], { type: 'image/jpeg' }));
    });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { url: 'https://s3.test/put', key: 'images/u1/upload/b.jpg', headers: {} } }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    await uploadScreenshot(file('chart.png', 'image/png'));
    expect(attempts).toEqual([0.85, 0.7, 0.5, 0.85]);
  });

  it('reports the API message when the presign is refused and never PUTs', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/jpeg' })));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Screenshots can be at most 2 MB.', errorCode: 'VALIDATION_ERROR' }) });
    await expect(uploadScreenshot(file('chart.png', 'image/png'))).rejects.toThrow('Screenshots can be at most 2 MB.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries the presign once with a refreshed token on a 401', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) => cb(new Blob(['x'], { type: 'image/jpeg' })));
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { url: 'https://s3.test/put', key: 'images/u1/upload/c.jpg', headers: {} } }) })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    expect(await uploadScreenshot(file('chart.png', 'image/png'))).toBe('images/u1/upload/c.jpg');
    expect(auth.getIdToken).toHaveBeenLastCalledWith({ forceRefresh: true });
  });
});
