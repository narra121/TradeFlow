#!/usr/bin/env node
/**
 * Regenerates every brand icon from the one mark the app uses (the lucide `chart-line` glyph, emerald, no tile):
 *   public/favicon.svg, favicon-192.png, favicon-512.png, apple-touch-icon.png (180), favicon.ico (16/32/48, PNG-in-ICO).
 * Run: node scripts/brand/build-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GREEN = '#10b981';
const DARK = '#0e1117';
const GLYPH = '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>';

const svg = (extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${GREEN}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"${extra}>${GLYPH}</svg>`;

/** Solid dark square with the mark at 56% (inside the maskable safe zone), for installed-app and touch icons. */
async function squareIcon(size) {
  const mark = Math.round(size * 0.56);
  const glyph = await sharp(Buffer.from(svg()), { density: 384 }).resize(mark, mark).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: DARK } })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** ICO container holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const pub = (f) => join('public', f);
writeFileSync(pub('favicon.svg'), `${svg()}\n`);
writeFileSync(pub('favicon-192.png'), await squareIcon(192));
writeFileSync(pub('favicon-512.png'), await squareIcon(512));
writeFileSync(pub('apple-touch-icon.png'), await squareIcon(180));
writeFileSync(pub('favicon.ico'), ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await squareIcon(size) })))));
console.log('brand icons written to public/');
