// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, it, expect } from 'vitest';
import { buildRouterSource, ROUTER_PATH } from '../../../scripts/seo/cf-router';

interface CfResult {
  uri?: string;
  statusCode?: number;
  headers: Record<string, { value: string }>;
}
type Handler = (event: unknown) => CfResult;

function loadHandler(): Handler {
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(`${readFileSync(ROUTER_PATH, 'utf8')}\nthis.handler = handler;`, ctx);
  return ctx.handler as Handler;
}

function req(uri: string, host = 'tradequt.com', querystring: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-request' },
    request: { method: 'GET', uri, querystring, headers: { host: { value: host } }, cookies: {} },
  };
}

function res(host: string, contentType?: string) {
  return {
    version: '1.0',
    context: { eventType: 'viewer-response' },
    request: { method: 'GET', uri: '/x/index.html', querystring: {}, headers: { host: { value: host } }, cookies: {} },
    response: { statusCode: 200, headers: (contentType ? { 'content-type': { value: contentType } } : {}) as Record<string, { value: string }> },
  };
}

describe('CloudFront router function', () => {
  const handler = loadHandler();

  it('committed infra/cloudfront/router.js matches the generator', () => {
    expect(readFileSync(ROUTER_PATH, 'utf8')).toBe(buildRouterSource());
  });

  it('maps extensionless public paths to their prerendered index.html', () => {
    expect(handler(req('/blog/forex-trading-journal')).uri).toBe('/blog/forex-trading-journal/index.html');
    expect(handler(req('/guide')).uri).toBe('/guide/index.html');
    expect(handler(req('/')).uri).toBe('/index.html');
  });

  it('serves the SPA shell for /app and /auth', () => {
    expect(handler(req('/app')).uri).toBe('/_spa.html');
    expect(handler(req('/app/dashboard')).uri).toBe('/_spa.html');
    expect(handler(req('/auth/callback', 'tradequt.com', { code: { value: 'abc' } })).uri).toBe('/_spa.html');
    expect(handler(req('/apple-touch-icon.png')).uri).toBe('/apple-touch-icon.png');
  });

  it('leaves files with an extension untouched', () => {
    for (const uri of ['/assets/index-abc.js', '/robots.txt', '/llms.txt', '/sitemap.xml', '/favicon.ico']) {
      expect(handler(req(uri)).uri).toBe(uri);
    }
  });

  it('301s trailing slashes and /index.html to the canonical path, keeping the query', () => {
    const r = handler(req('/blog/', 'tradequt.com', { utm_source: { value: 'x' } }));
    expect(r.statusCode).toBe(301);
    expect(r.headers.location.value).toBe('/blog?utm_source=x');
    expect(handler(req('/guide/index.html')).headers.location.value).toBe('/guide');
    expect(handler(req('/index.html')).headers.location.value).toBe('/');
  });

  it('301s www to the apex host', () => {
    const r = handler(req('/blog', 'www.tradequt.com', { a: { value: '1', multiValue: [{ value: '1' }, { value: '2' }] } }));
    expect(r.statusCode).toBe(301);
    expect(r.headers.location.value).toBe('https://tradequt.com/blog?a=1&a=2');
  });

  it('adds noindex only on non-canonical hosts', () => {
    expect(handler(res('dev.tradequt.com')).headers['x-robots-tag'].value).toBe('noindex, nofollow');
    expect(handler(res('d1234.cloudfront.net')).headers['x-robots-tag'].value).toBe('noindex, nofollow');
    expect(handler(res('tradequt.com')).headers['x-robots-tag']).toBeUndefined();
  });

  describe('security headers (viewer-response)', () => {
    const html = handler(res('tradequt.com', 'text/html; charset=utf-8')).headers;

    it('sends HSTS, nosniff and a referrer policy on every response, an asset included', () => {
      for (const headers of [html, handler(res('tradequt.com', 'text/javascript')).headers, handler(res('tradequt.com')).headers]) {
        expect(headers['strict-transport-security'].value).toBe('max-age=31536000');
        expect(headers['x-content-type-options'].value).toBe('nosniff');
        expect(headers['referrer-policy'].value).toBe('strict-origin-when-cross-origin');
      }
    });

    it('sends the CSP headers on HTML only', () => {
      expect(html['content-security-policy']).toBeDefined();
      expect(html['content-security-policy-report-only']).toBeDefined();
      for (const type of ['text/javascript', 'image/png', undefined]) {
        const headers = handler(res('tradequt.com', type)).headers;
        expect(headers['content-security-policy']).toBeUndefined();
        expect(headers['content-security-policy-report-only']).toBeUndefined();
      }
    });

    it('enforces only frame-ancestors; the full policy is Report-Only', () => {
      expect(html['content-security-policy'].value).toBe("frame-ancestors 'none'");
      const policy = html['content-security-policy-report-only'].value;
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("object-src 'none'");
      expect(policy).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    });

    it('lists the origins the app talks to', () => {
      const directives = Object.fromEntries(
        html['content-security-policy-report-only'].value.split('; ').map((d) => [d.split(' ')[0], d.split(' ').slice(1)]),
      );
      expect(directives['script-src']).toEqual(expect.arrayContaining(["'self'", 'https://www.googletagmanager.com', 'https://pagead2.googlesyndication.com']));
      expect(directives['connect-src']).toEqual(
        expect.arrayContaining([
          'https://*.tradequt.com',
          'https://*.execute-api.us-east-1.amazonaws.com',
          'https://cognito-idp.us-east-1.amazonaws.com',
          'https://*.s3.us-east-1.amazonaws.com',
          'https://*.google-analytics.com',
          'https://analytics.google.com',
        ]),
      );
      expect(directives['img-src']).toEqual(expect.arrayContaining(['data:', 'blob:']));
    });

    it('hashes the inline boot script in index.html as the browser reads it (LF)', () => {
      const scripts = [...readFileSync('index.html', 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      expect(scripts.length).toBeGreaterThan(0);
      const policy = html['content-security-policy-report-only'].value;
      for (const text of scripts) {
        const hash = createHash('sha256').update(text.replace(/\r\n?/g, '\n')).digest('base64');
        expect(policy).toContain(`'sha256-${hash}'`);
      }
    });
  });
});
