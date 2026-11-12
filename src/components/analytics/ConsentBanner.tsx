import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { readConsent, saveConsent } from '@/lib/analytics';

interface ConsentBannerProps {
  onClose: () => void;
}

/** Non-blocking consent panel (EEA/UK/CH visitors, or anyone via "Cookie settings"). Accept and reject carry equal weight. */
export function ConsentBanner({ onClose }: ConsentBannerProps) {
  const titleId = useId();
  const stored = readConsent();
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(stored?.analytics ?? false);
  const [ads, setAds] = useState(stored?.ads ?? false);

  const decide = (choice: { analytics: boolean; ads: boolean }) => {
    saveConsent(choice);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-4 [box-shadow:var(--shadow-overlay)] sm:p-5">
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          Cookies and privacy
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We use Google Analytics to understand which public pages help traders. We show no ads today; if we add ads to public
          articles they will use Google AdSense. Neither runs inside your journal. Essential storage for sign-in is always on.
          See our{' '}
          <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>

        {customize && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between gap-4 text-sm text-foreground">
              <span>
                Analytics <span className="text-muted-foreground">— anonymous usage statistics</span>
              </span>
              <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="Allow analytics" />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm text-foreground">
              <span>
                Advertising <span className="text-muted-foreground">— personalised ads, only if ads are shown on public articles</span>
              </span>
              <Switch checked={ads} onCheckedChange={setAds} aria-label="Allow advertising" />
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {customize ? (
            <Button variant="outline" onClick={() => decide({ analytics, ads })}>
              Save choices
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setCustomize(true)}>
              Customize
            </Button>
          )}
          <Button variant="outline" onClick={() => decide({ analytics: false, ads: false })}>
            Reject non-essential
          </Button>
          <Button variant="outline" onClick={() => decide({ analytics: true, ads: true })}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
