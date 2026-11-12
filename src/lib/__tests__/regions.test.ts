import { afterEach, describe, expect, it } from 'vitest';
import { focusNextRegion } from '../regions';

const page = () => {
  document.body.innerHTML = `
    <nav aria-label="Main"><a href="/a" id="nav-link">Dashboard</a></nav>
    <header><button id="top-btn">Add</button></header>
    <div role="toolbar" aria-label="Data shown"><button id="scope-btn">Scope</button></div>
    <main id="main" tabindex="-1"><button id="main-btn">Go</button></main>`;
};

describe('focusNextRegion', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts at the sidebar and walks the regions in order, wrapping around', () => {
    page();
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('nav-link');
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('top-btn');
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('scope-btn');
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('main-btn');
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('nav-link');
  });

  it('walks backwards with Shift+F6', () => {
    page();
    document.getElementById('top-btn')?.focus();
    focusNextRegion(-1);
    expect(document.activeElement?.id).toBe('nav-link');
  });

  it('skips regions that are not on the page', () => {
    document.body.innerHTML = '<main id="main" tabindex="-1"><button id="b">x</button></main>';
    focusNextRegion(1);
    expect(document.activeElement?.id).toBe('b');
  });
});
