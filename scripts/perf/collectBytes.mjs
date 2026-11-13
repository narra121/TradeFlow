import { gzipSync } from 'node:zlib';

/**
 * Counts the bytes the page transferred from `base`: gzip JS and CSS, font bytes and files. A response body is read
 * asynchronously, so `settled()` must be awaited before the totals are read or the page is closed.
 */
export function createByteCounter(base) {
  const bytes = { js: 0, css: 0, font: 0, fontFiles: new Set(), other: 0 };
  const reads = [];

  async function read(res) {
    try {
      const url = res.url();
      if (!url.startsWith(base)) return;
      const body = await res.body();
      if (/\.js(\?|$)/.test(url)) bytes.js += gzipSync(body).length;
      else if (/\.css(\?|$)/.test(url)) bytes.css += gzipSync(body).length;
      else if (/\.woff2(\?|$)/.test(url)) {
        bytes.font += body.length;
        bytes.fontFiles.add(url);
      } else bytes.other += body.length;
    } catch {
      /* a response without a body (redirect, aborted) does not count */
    }
  }

  return {
    bytes,
    onResponse: (res) => void reads.push(read(res)),
    /** Resolves once every response seen so far, and any that arrived while waiting, has been read. */
    async settled() {
      for (let seen = -1; seen !== reads.length; ) {
        seen = reads.length;
        await Promise.all(reads);
      }
    },
  };
}
