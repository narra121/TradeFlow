import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FigureCards } from '../FigureCards';
import { ANSWERS } from '../AnswersSection';
import { RULE_CARDS, RulesSection } from '../RulesSection';

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

/** An IntersectionObserver that reports every observed element as on screen (`near`) or never reports. */
function stubObservers(near: boolean) {
  class Io extends NoopObserver {
    constructor(private cb: (entries: { isIntersecting: boolean }[]) => void) {
      super();
    }
    observe() {
      if (near) this.cb([{ isIntersecting: true }]);
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', Io);
}

afterEach(() => vi.unstubAllGlobals());

const CARDS = [...ANSWERS, ...RULE_CARDS];

describe('FigureCards', () => {
  it('numbers the figures from `first` and puts each question under its picture as a heading', () => {
    stubObservers(false);
    render(<FigureCards items={RULE_CARDS} first={4} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(RULE_CARDS.map((c) => c.question));
    expect(screen.getByText('Fig. 04 · What-if replay')).toBeInTheDocument();
    expect(screen.getByText('Fig. 06 · Chat')).toBeInTheDocument();
    expect(screen.getAllByText('Sample data')).toHaveLength(3);
  });

  it('holds each picture’s place and loads nothing while the row is far from the screen', () => {
    stubObservers(false);
    const { container } = render(<FigureCards items={CARDS} />);
    expect(container.querySelectorAll('.lp-card__hold')).toHaveLength(CARDS.length);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('shows every picture once the row is near, each labelled as sample data, with nothing focusable inside', async () => {
    stubObservers(true);
    const { container } = render(<FigureCards items={CARDS} />);
    // The first import of the picture chunk compiles every showcase module, which can take seconds on a busy machine.
    const pictures = await screen.findAllByRole('img', {}, { timeout: 20_000 });
    expect(pictures).toHaveLength(CARDS.length);
    for (const p of pictures) {
      expect(p.getAttribute('aria-label')).toMatch(/^Sample data: /);
      expect(p.firstElementChild).toHaveAttribute('aria-hidden', 'true');
      expect(p.querySelectorAll('a,button,input,select,textarea,[tabindex]')).toHaveLength(0);
    }
    expect(container.querySelectorAll('.lp-card__hold')).toHaveLength(0);
    expect(screen.getByRole('img', { name: /expectancy \+0\.26R per trade with a range of −0\.07R to \+0\.61R, not proven yet/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /kept on 10 of 12 trades and broken on 2, which cost \$15\.75/ })).toBeInTheDocument();
    // Without the landing's motion provider nothing plays: each picture is its final still.
    expect(container.textContent).toContain('Kept on 10 of 12 trades');
  }, 30_000);
});

describe('RulesSection', () => {
  it('is a labelled region that says who calculates and links to the tab list on the pricing page', () => {
    stubObservers(false);
    render(
      <MemoryRouter>
        <RulesSection />
      </MemoryRouter>,
    );
    const region = screen.getByRole('region', { name: /One rule a week/ });
    expect(within(region).getByText('In the review and in chat a model writes the sentences. The figures are calculated by code, never by the model.')).toBeInTheDocument();
    expect(within(region).getByRole('link', { name: 'Every Analytics tab and the question it answers' })).toHaveAttribute('href', '/pricing#analytics');
  });
});
