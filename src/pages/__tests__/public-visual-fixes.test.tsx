import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { TooltipProvider } from '@/components/ui/tooltip';
import { renderWithProviders } from '@/test/test-utils';
import { CASE_STUDIES } from '@/content/case-studies/studies';
import { COMPETITORS } from '@/content/alternatives';
import { CaseStudyPage } from '../case-studies/CaseStudyPage';
import { GlossaryPage } from '../glossary/GlossaryPage';
import { CompoundingCalculatorPage } from '../resources/CompoundingCalculatorPage';
import { PositionSizeCalculatorPage } from '../resources/PositionSizeCalculatorPage';
import { RiskRewardCalculatorPage } from '../resources/RiskRewardCalculatorPage';
import { RiskOfRuinCalculatorPage } from '../resources/RiskOfRuinCalculatorPage';
import { PropFirmDrawdownCalculatorPage } from '../resources/PropFirmDrawdownCalculatorPage';
import { ExpectancyCalculatorPage } from '../resources/ExpectancyCalculatorPage';
import { MarginCalculatorPage } from '../resources/MarginCalculatorPage';

async function fill(label: RegExp | string, value: string) {
  const user = userEvent.setup();
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  return input;
}

/** The field is marked invalid and its message is announced with it. */
function expectFieldError(input: HTMLElement, text: string) {
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(text);
}

describe('calculators flag the field that needs fixing, next to it (L21-029)', () => {
  it('compounding: a rate of −100% marks Return per period', async () => {
    renderWithProviders(<CompoundingCalculatorPage />);
    const input = await fill('Return per period (%)', '-100');
    expectFieldError(input, 'The return per period must be above −100%.');
    expect(screen.getByLabelText('Number of periods')).not.toHaveAttribute('aria-invalid');
  });

  it('position size: a zero stop marks the stop field', async () => {
    renderWithProviders(<PositionSizeCalculatorPage />);
    expectFieldError(await fill('Stop loss distance (pips)', '0'), 'Enter a stop loss above 0 pips.');
  });

  it('risk-reward: a short with the stop under the entry marks the stop, not the target', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RiskRewardCalculatorPage />);
    await user.click(screen.getByText('Short'));
    await fill('Entry price', '1.2650');
    await fill('Take profit price', '1.2500');
    const stop = await fill('Stop loss price', '1.2600');
    expectFieldError(stop, 'For a short trade the stop loss must be above the entry.');
    expect(screen.getByLabelText('Take profit price')).not.toHaveAttribute('aria-invalid');
  });

  it('risk of ruin, prop drawdown, expectancy and margin mark their own fields', async () => {
    const one = renderWithProviders(<RiskOfRuinCalculatorPage />);
    expectFieldError(await fill('Risk per trade (% of balance)', '0'), 'Risk per trade must be above 0% and below 100%.');
    one.unmount();
    const two = renderWithProviders(<PropFirmDrawdownCalculatorPage />);
    expectFieldError(await fill('Daily loss limit (%)', '0'), 'The daily loss limit must be above 0% and below 100%.');
    two.unmount();
    const three = renderWithProviders(<ExpectancyCalculatorPage />);
    expectFieldError(await fill('Win rate (%)', '140'), 'Win rate must be between 0 and 100 percent.');
    three.unmount();
    renderWithProviders(<MarginCalculatorPage />);
    expectFieldError(await fill('Position size (lots)', '0'), 'Enter a position size above 0 lots.');
  });
});

describe('prop drawdown checkbox (L21-023)', () => {
  it('uses the theme accent, like the page’s other selected controls', () => {
    renderWithProviders(<PropFirmDrawdownCalculatorPage />);
    // The lock box shows with the trailing limit.
    return userEvent
      .setup()
      .click(screen.getByLabelText('Trailing'))
      .then(() => expect(screen.getByRole('checkbox')).toHaveClass('accent-primary'));
  });
});

describe('glossary search (L21-021)', () => {
  it('hides the browser’s own clear glyph and offers a themed Clear button while there is text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GlossaryPage />);
    const search = screen.getByLabelText('Search terms');
    expect(search.className).toContain('[&::-webkit-search-cancel-button]:appearance-none');
    expect(screen.queryByRole('button', { name: 'Clear search text' })).toBeNull();
    await user.type(search, 'expectancy');
    await user.click(screen.getByRole('button', { name: 'Clear search text' }));
    expect(search).toHaveValue('');
  });
});

describe('scenario pages have a way up (L21-024)', () => {
  it('shows the breadcrumb its JSON-LD already declares: Journaling scenarios / title', async () => {
    const study = CASE_STUDIES[0];
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/case-studies/${study.slug}`]}>
          <TooltipProvider>
            <Routes>
              <Route path="/case-studies/:slug" element={<CaseStudyPage />} />
            </Routes>
          </TooltipProvider>
        </MemoryRouter>
      </HelmetProvider>,
    );
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Journaling scenarios' })).toHaveAttribute('href', '/case-studies');
    expect(crumbs).toHaveTextContent(study.title);
  });
});

describe('comparison prose dates are day first and short (L21-020)', () => {
  it('facts, unverified notes and the fit text never write a long month name', () => {
    const LONG = /\b\d{1,2} (January|February|March|April|June|July|August|September|October|November|December) 20\d\d\b/;
    for (const c of COMPETITORS) {
      const prose = [...c.facts, ...(c.unverified ?? []), ...c.tradequtFits].join(' ');
      expect(prose, c.id).not.toMatch(LONG);
    }
  });
});
