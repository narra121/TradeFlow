import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { PublicLayout } from '@/components/public/PublicLayout';
import { GUIDE_ALIASES } from '@/content/guideAnchors';
import { GUIDE_ARTICLE_SCHEMA } from '@/config/seo';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Section ids are public anchors (see src/content/guideAnchors.ts): never rename one, add an alias instead. */
const sections = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'adding-trades', label: 'Adding a trade' },
  { id: 'importing-trades', label: 'Importing trades' },
  { id: 'trade-log', label: 'Trades and calendar' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'insights', label: 'Insights and chat' },
  { id: 'goals-rules', label: 'Goals and rules' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'settings', label: 'Settings, profile and billing' },
] as const;

function useActiveSection() {
  const [active, setActive] = useState<string>(sections[0].id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: '-120px 0px -50% 0px', threshold: 0.1 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return active;
}

function GuideScreenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="my-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Enlarge screenshot: ${alt}`}
          className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border hover:border-border-strong"
        >
          <img src={src} alt={alt} loading="lazy" decoding="async" className="h-auto w-full" width={1440} height={900} />
        </button>
        {caption && <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>}
      </figure>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] overflow-auto border-border bg-background p-0">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close screenshot"
            className="absolute right-4 top-4 z-50 inline-flex h-8 w-8 items-center justify-center rounded-md bg-background hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <img src={src} alt={alt} className="h-auto w-full" width={1440} height={900} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-2 pl-6 text-foreground-soft">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-foreground-soft">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-border bg-card p-3 text-sm text-foreground-soft">{children}</p>;
}

function SectionWrapper({ id, title, summary, children }: { id: string; title: string; summary: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      {(GUIDE_ALIASES[id] ?? []).map((alias) => (
        <span key={alias} id={alias} className="block scroll-mt-24" />
      ))}
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{summary}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function GuideTOC({ variant, active }: { variant: 'vertical' | 'horizontal'; active: string }) {
  const activeRef = useRef<HTMLButtonElement>(null);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (variant === 'horizontal') activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active, variant]);

  if (variant === 'vertical') {
    return (
      <nav aria-label="Guide navigation" className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contents</h2>
        <ul className="space-y-0.5">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => scrollTo(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
                className={cn(
                  'flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-medium',
                  active === s.id ? 'bg-primary/10 text-primary' : 'text-foreground-soft hover:bg-secondary hover:text-foreground',
                )}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Guide navigation" className="flex gap-2 overflow-x-auto px-4 py-3">
      {sections.map((s) => (
        <button
          key={s.id}
          ref={active === s.id ? activeRef : undefined}
          onClick={() => scrollTo(s.id)}
          aria-current={active === s.id ? 'true' : undefined}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-md border px-3 text-xs font-medium',
            active === s.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-foreground-soft hover:text-foreground',
          )}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

function Content() {
  return (
    <>
      <SectionWrapper id="getting-started" title="Getting started" summary="Create an account, add a trading account, then log or import trades.">
        <Steps
          items={[
            'Sign up with your email or Google. A new account starts with a 14-day free trial of every Pro feature and no card; after it the journal is read-only unless you upgrade.',
            'Open Accounts and choose Add account: give it a name, the broker, the type and its currency. Keep one account per real account.',
            'Add your first trade with Add trade, or bring many in at once with Import.',
            'Use the account and period pickers under the page title to choose what every page shows.',
          ]}
        />
        <GuideScreenshot
          src="/guide/sidebar.png"
          alt="Dashboard with the sidebar, top bar and scope bar"
          caption="Sidebar groups: Journal (Dashboard, Trades, Calendar), Review (Analytics, Goals & rules, Insights), Data (Accounts, Import). Jump to… (Ctrl K) opens any page."
        />
        <Note>
          Amounts in different currencies are never added together. With more than one currency, totals are shown per currency and
          some figures ask you to pick one account.
        </Note>
      </SectionWrapper>

      <SectionWrapper id="dashboard" title="Dashboard" summary="Today, this week and your overall numbers at a glance.">
        <GuideScreenshot
          src="/guide/dashboard.png"
          alt="Dashboard with today strip, key figures, month calendar and goals this week"
          caption="Top: today, the week's trade count and drawdown against your limits. Below: net P&L, win rate, profit factor, planned R:R and max drawdown."
        />
        <Bullets
          items={[
            'The strip at the top shows today, this week against your trade limit, and drawdown against its limit.',
            'The key figures are for the account and period you picked. Profit factor and max drawdown need one account.',
            'The equity curve appears when one account is selected. The month calendar and Goals this week sit beside it.',
            'Recent trades and Needs attention (for example trades without a screenshot) take you straight to the Trades page.',
          ]}
        />
      </SectionWrapper>

      <SectionWrapper id="adding-trades" title="Adding a trade" summary="One pane, opened from the top bar on any page.">
        <Steps
          items={[
            'Choose Add trade in the top bar. The New trade pane opens beside the page you were on.',
            'Pick the account, asset class and direction (Long or Short), then enter the symbol.',
            'Enter entry, exit, stop loss and take profit, the size, and when the trade opened and closed.',
            'Check fees and net P&L, choose the outcome (TP hit, Partial, SL hit, Breakeven), and below that add the journal fields: strategy, session, market condition, mistakes, broken rules, a key lesson, notes and screenshots.',
            'Save the trade. Save & add another keeps the pane open for the next one.',
          ]}
        />
        <GuideScreenshot
          src="/guide/add-trade.png"
          alt="The New trade pane next to the trades table"
          caption="The pane opens beside the table, so you can compare with earlier trades while you type."
        />
        <Note>Many trades to enter? The link at the top of the pane takes you to Import.</Note>
      </SectionWrapper>

      <SectionWrapper id="importing-trades" title="Importing trades" summary="Upload the file your broker gives you; review before saving.">
        <Steps
          items={[
            'Open Import and choose the account the trades belong to.',
            'Leave Source on Auto-detect, or pick your broker. Each broker button shows how to export its file.',
            'Drop the file, paste it, or choose files. CSV, XLSX and HTML files up to 4 MB are accepted; screenshots (PNG, JPG, WebP) up to 1 MB each, up to 15.',
            'Review what was found, fix anything marked, and import.',
          ]}
        />
        <GuideScreenshot
          src="/guide/import-trades.png"
          alt="Import page with account, source, drop zone and broker export guides"
          caption="Brokers with a guide: Zerodha (tradebook and P&L statement), Dhan, Upstox, Angel One, Groww, MetaTrader 4 and 5, and any other CSV."
        />
        <Bullets
          items={[
            'Broker not listed? Download the CSV template on the page, fill in your trades and import it as Other CSV.',
            'The bar under the title shows how many broker imports your plan has left this month.',
            'Automatic broker sync is planned for Pro and is not available yet.',
          ]}
        />
      </SectionWrapper>

      <SectionWrapper id="trade-log" title="Trades and calendar" summary="Every trade in one table, and the same trades by day.">
        <GuideScreenshot
          src="/guide/tradelog-table.png"
          alt="Trades table grouped by day with filters"
          caption="Tabs: All, Winners, Losers, Needs journal. Filters: Symbol, Outcome, Strategy, Session, Mistake, Tag, Broken rule. Find (/) searches the table."
        />
        <Bullets
          items={[
            'Trades are grouped by day, with each day’s result on the group row. Collapse a day to hide its trades.',
            'Click a trade to open it in the pane: edit its numbers or add the strategy, mistakes, broken rules, key lesson, notes and screenshots.',
            'Tick the checkboxes to select several trades and act on them together.',
          ]}
        />
        <GuideScreenshot src="/guide/view-trade.png" alt="Trades table with a trade selected" caption="Opening a trade keeps your place in the table." />
        <GuideScreenshot src="/guide/column-toggle.png" alt="Columns menu of the trades table" caption="The Columns menu chooses what the table shows." />
        <GuideScreenshot
          src="/guide/tradelog-calendar.png"
          alt="Month calendar tinted by net P&L"
          caption="Calendar: Month, Week and Year views, coloured by net P&L, with weekly totals on the right."
        />
        <Bullets
          items={[
            'Each day shows its net result and number of trades. The tint has three steps against the month’s largest day: green for a gain, red for a loss.',
            'A ! on a day means a trade broke a rule. Days are by the time the trade closed, in the time zone shown under the calendar.',
          ]}
        />
      </SectionWrapper>

      <SectionWrapper id="analytics" title="Analytics" summary="See which setups, hours and habits make or lose money.">
        <GuideScreenshot
          src="/guide/analytics-metrics.png"
          alt="Analytics overview with performance, trades and risk figures"
          caption="Tabs: Overview, Edge, Timing, Risk, Behaviour and Tax."
        />
        <Bullets
          items={[
            'Overview shows performance, trade and risk figures for the account and period you picked, then Do I have an edge?: win rate with its range beside the break-even win rate, and expectancy in R with its range. A label says how far to trust them: too few or early under 30 trades, provisional up to 99, established from 100.',
            'The equity and drawdown chart has a View as table switch for a text version of the same numbers.',
            'What is working, what is not names an edge or a leak only with at least 30 trades in the group, 30 outside it and a steady difference. Until then it lists patterns to watch with their trade counts.',
            'Edge groups results by symbol, strategy, session, weekday, hour, tag and more. Timing shows weekday and hour, trade number in the day and holding time. Risk shows losses past the stop, risk per trade, drawdown and R distribution.',
            'Behaviour checks every trade against a fixed list of habits, such as a new trade within 15 minutes of a loss, and shows what each mistake and broken rule cost. What if I had followed a rule? replays the period without the trades a rule would have blocked; it removes trades that happened and predicts nothing.',
            'Tax (Pro) covers one Indian financial year for accounts in rupees: charges split into STT, exchange charges, SEBI fee and stamp duty, and P&L by tax category to take to your CA. It is not tax advice.',
          ]}
        />
        <GuideScreenshot src="/guide/analytics-charts.png" alt="Equity and drawdown chart with the segments table" caption="Equity and drawdown, then the best and worst segments." />
      </SectionWrapper>

      <SectionWrapper id="insights" title="Insights and chat" summary="AI reports and questions about your own trades.">
        <Bullets
          items={[
            'Insights › Reports: choose the account and period in the top bar, then Generate report. The report is a review: a verdict, the one behaviour that cost the most (with an if-then rule you can make your focus, when one applies), how the last focus went, and patterns to watch, each with its figures and the trades behind it.',
            'Insights › Chat: ask about your own journal, for example how you perform after a losing trade. The answer is calculated from your recorded trades, with the figures in a table.',
            'Both have monthly limits, listed on the pricing page, and the trial and Pro also get a weekly report. The page shows how many you have left.',
            'Neither one recommends trades, strikes or securities.',
          ]}
        />
        <Note>
          Reports and chat send figures computed from your trades through OpenRouter to OpenAI, only when you use them or for
          the weekly report. They never send your screenshots, email or account names. Reports include your notes and key
          lessons only if you switch on Use my notes; chat never sends them.
        </Note>
      </SectionWrapper>

      <SectionWrapper id="goals-rules" title="Goals and rules" summary="Set weekly or monthly limits and the rules you want to follow.">
        <GuideScreenshot
          src="/guide/goals-weekly.png"
          alt="Goals for the week with progress and the rules table"
          caption="Switch between Week and Month. Goals: profit target, win rate, max drawdown limit and max trades limit."
        />
        <Bullets
          items={[
            'Each goal shows where you are against its target and whether you are within the limit. Edit changes it.',
            'Add rule creates a rule such as setting the stop loss before entry. Mark the rules a trade broke in the Broken rules field of the trade pane.',
            'The rules table shows this week, what the breaks cost, the last eight weeks and the current streak.',
          ]}
        />
        <GuideScreenshot src="/guide/goals-rules.png" alt="Rules table lower on the Goals and rules page" caption="Rules with their weekly status and history." />
      </SectionWrapper>

      <SectionWrapper id="accounts" title="Accounts" summary="One row per real trading account, each with its own currency.">
        <GuideScreenshot
          src="/guide/accounts.png"
          alt="Accounts table with balance, net since start and trade counts"
          caption="Balance, net result since start, number of trades and last trade for each account, with totals per currency below."
        />
        <Bullets
          items={[
            'Add account creates one. Each row also has a ... menu with more actions.',
            'View journal opens the Trades page filtered to that account.',
            'The trial and Pro have no account limit.',
          ]}
        />
      </SectionWrapper>

      <SectionWrapper id="settings" title="Settings, profile and billing" summary="Your details, journal options and plan.">
        <GuideScreenshot
          src="/guide/settings.png"
          alt="Settings with the section list and the Profile section"
          caption="Account (Profile, Sign-in & security), Journal (Preferences, Trade options, Notifications), Data & privacy, Plan & billing."
        />
        <Bullets
          items={[
            'Profile: your name is shown in the user menu and in emails we send you. Your email is your log-in name.',
            'Trade options holds the lists you pick from when you add a trade, such as strategies, sessions and mistakes.',
            'Data & privacy: export your data and delete your account.',
            'Plan & billing: your plan and usage this month, the upgrade options, and the billing portal for payment details and cancellation.',
          ]}
        />
        <GuideScreenshot src="/guide/profile.png" alt="Profile section of Settings" caption="Profile and the other Settings sections." />
      </SectionWrapper>
    </>
  );
}

export function GuidePage() {
  const active = useActiveSection();

  return (
    <PublicLayout>
      <SEO
        title="TradeQut User Guide - How to Log, Import and Review Your Trades"
        description="How to use TradeQut: add trading accounts, log or import trades, read the dashboard, calendar and analytics, set goals and rules."
        path="/guide"
        type="article"
        jsonLd={GUIDE_ARTICLE_SCHEMA}
      />

      <div>
        <article>
          <section className="px-4 pb-8 pt-10 sm:px-6 sm:pt-12">
            <div className="mx-auto max-w-7xl">
              <h1 className="mb-3 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">How to use TradeQut</h1>
              <p className="max-w-2xl text-base text-foreground-soft">
                A step-by-step guide to adding accounts, logging and importing trades, and reading your results. Screenshots show
                sample data.
              </p>
            </div>
          </section>

          <div className="sticky top-14 z-30 border-b border-border bg-background lg:hidden">
            <GuideTOC variant="horizontal" active={active} />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
            <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
              <aside className="sticky top-20 hidden self-start lg:block">
                <GuideTOC variant="vertical" active={active} />
              </aside>

              <div className="max-w-3xl space-y-16 pt-6 lg:space-y-20 lg:pt-0">
                <Content />

                <div className="signed-out-only border-t border-border py-12">
                  <h2 className="mb-3 text-2xl font-semibold text-foreground">Ready to start?</h2>
                  <p className="mb-6 text-muted-foreground">Start with the 14-day free trial. No card required.</p>
                  <Button asChild size="lg">
                    <Link to="/signup">Start free</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
