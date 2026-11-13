import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { createByteCounter } from '../../scripts/perf/collectBytes.mjs';

const BASE = 'http://localhost:4180';
/** A response whose body arrives after `delay` ms, like a large asset still downloading. */
const response = (url: string, body: string, delay = 0) => ({
  url: () => url,
  body: () => new Promise<Buffer>((resolve) => setTimeout(() => resolve(Buffer.from(body)), delay)),
});

describe('perf budget byte counter (FE-084)', () => {
  it('counts gzip JS and CSS, fonts and other bytes from the site only', async () => {
    const c = createByteCounter(BASE);
    const js = 'x'.repeat(5000);
    c.onResponse(response(`${BASE}/assets/a.js`, js));
    c.onResponse(response(`${BASE}/assets/a.css`, 'y'.repeat(2000)));
    c.onResponse(response(`${BASE}/assets/f.woff2`, 'font-bytes'));
    c.onResponse(response('https://fonts.example.test/x.js', js));
    await c.settled();
    expect(c.bytes.js).toBe(gzipSync(Buffer.from(js)).length);
    expect(c.bytes.css).toBe(gzipSync(Buffer.from('y'.repeat(2000))).length);
    expect(c.bytes.font).toBe('font-bytes'.length);
    expect([...c.bytes.fontFiles]).toEqual([`${BASE}/assets/f.woff2`]);
  });

  it('waits for a body still downloading, so a late response is not dropped', async () => {
    const c = createByteCounter(BASE);
    c.onResponse(response(`${BASE}/assets/slow.js`, 'z'.repeat(4000), 40));
    expect(c.bytes.js).toBe(0);
    await c.settled();
    expect(c.bytes.js).toBeGreaterThan(0);
  });

  it('also waits for responses that arrive while it is waiting', async () => {
    const c = createByteCounter(BASE);
    c.onResponse(response(`${BASE}/assets/first.js`, 'a'.repeat(3000), 20));
    setTimeout(() => c.onResponse(response(`${BASE}/assets/second.js`, 'b'.repeat(3000), 20)), 10);
    await c.settled();
    expect(c.bytes.js).toBe(gzipSync(Buffer.from('a'.repeat(3000))).length * 2);
  });

  it('ignores a response with no body', async () => {
    const c = createByteCounter(BASE);
    c.onResponse({ url: () => `${BASE}/redirect.js`, body: () => Promise.reject(new Error('no body')) });
    await c.settled();
    expect(c.bytes.js).toBe(0);
  });
});
