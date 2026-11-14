import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConsentBanner } from '../ConsentBanner';
import { AnalyticsRoot } from '../AnalyticsRoot';
import { OPEN_CONSENT_EVENT, readConsent } from '@/lib/analytics';

beforeEach(() => {
  localStorage.clear();
  delete window.dataLayer;
  delete window.gtag;
});

describe('ConsentBanner', () => {
  it('gives Accept all and Reject non-essential equal prominence and stores the choice', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ConsentBanner onClose={onClose} />
      </MemoryRouter>,
    );
    const accept = screen.getByRole('button', { name: 'Accept all' });
    const reject = screen.getByRole('button', { name: 'Reject non-essential' });
    expect(accept.className).toBe(reject.className);
    await user.click(reject);
    expect(readConsent()).toMatchObject({ analytics: false, ads: false });
    expect(onClose).toHaveBeenCalled();
  });

  it('reserves its height at the bottom of the page while open, so a focused control never sits under it (WCAG 2.4.11)', () => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(180);
    try {
      const { unmount } = render(
        <MemoryRouter>
          <ConsentBanner onClose={vi.fn()} />
        </MemoryRouter>,
      );
      expect(document.documentElement.style.scrollPaddingBottom).toBe('180px');
      expect(document.body.style.paddingBottom).toBe('180px');
      unmount();
      expect(document.documentElement.style.scrollPaddingBottom).toBe('');
      expect(document.body.style.paddingBottom).toBe('');
    } finally {
      height.mockRestore();
    }
  });

  it('saves per-category choices from Customize', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ConsentBanner onClose={() => {}} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('switch', { name: 'Allow analytics' }));
    await user.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(readConsent()).toMatchObject({ analytics: true, ads: false });
  });

  it('does not claim ads run today', () => {
    render(
      <MemoryRouter>
        <ConsentBanner onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/We show no ads today/)).toBeInTheDocument();
  });
});

describe('AnalyticsRoot', () => {
  it('renders nothing visible by default (automation, no banner)', () => {
    const { container } = render(
      <MemoryRouter>
        <AnalyticsRoot />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the banner when the footer asks for cookie settings', async () => {
    render(
      <MemoryRouter>
        <AnalyticsRoot />
      </MemoryRouter>,
    );
    await act(async () => {
      window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
    });
    expect(screen.getByRole('dialog', { name: 'Cookies and privacy' })).toBeInTheDocument();
  });
});
