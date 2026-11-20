import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { lazyPage } from '../lazyPage';

const Fallback = () => <p>spinner</p>;
const page = () => Promise.resolve({ default: () => <h1>Real page</h1> });

describe('lazyPage', () => {
  it('renders a preloaded page on the first render, never its Suspense fallback', async () => {
    const Page = lazyPage(page);
    await Page.preload();
    render(
      <Suspense fallback={<Fallback />}>
        <Page />
      </Suspense>,
    );
    expect(screen.getByRole('heading', { name: 'Real page' })).toBeInTheDocument();
    expect(screen.queryByText('spinner')).not.toBeInTheDocument();
  });

  it('suspends like lazy() when the page was not preloaded', async () => {
    const Page = lazyPage(page);
    render(
      <Suspense fallback={<Fallback />}>
        <Page />
      </Suspense>,
    );
    expect(screen.getByText('spinner')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Real page' })).toBeInTheDocument();
  });

  it('retries the import after a failed load', async () => {
    let calls = 0;
    const Page = lazyPage(() => (++calls === 1 ? Promise.reject(new Error('offline')) : page()));
    await expect(Page.preload()).rejects.toThrow('offline');
    await act(() => Page.preload());
    expect(calls).toBe(2);
  });
});
