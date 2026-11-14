import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CASE_STUDIES } from '@/content/case-studies/studies';
import { lazyContent } from '@/content/lazyContent';
import { CaseStudyPage } from '../case-studies/CaseStudyPage';

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <TooltipProvider>
          <Routes>
            <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
            <Route path="/case-studies" element={<div>Case studies index</div>} />
          </Routes>
        </TooltipProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('CaseStudyPage (FE-082)', () => {
  it('shows a study, and the not-found page for an unknown slug', async () => {
    const study = CASE_STUDIES[0];
    renderAt(`/case-studies/${study.slug}`);
    expect(await screen.findByRole('heading', { level: 1, name: study.title })).toBeInTheDocument();
    renderAt('/case-studies/nope');
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByText('Case studies index')).not.toBeInTheDocument();
  });

  it('uses the shared lazy cache: the same study is always the same component', () => {
    const study = CASE_STUDIES[0];
    expect(lazyContent(`case-study/${study.slug}`, study.content)).toBe(lazyContent(`case-study/${study.slug}`, study.content));
  });
});
