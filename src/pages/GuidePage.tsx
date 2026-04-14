import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Zap,
  ArrowLeft,
  Rocket,
  LayoutDashboard,
  Plus,
  Upload,
  BookOpen,
  TrendingUp,
  Target,
  Settings,
  User,
  Lightbulb,
  AlertTriangle,
  Info,
  Keyboard,
  ArrowRight,
  BarChart3,
  Calendar,
  Shield,
  FileText,
  Camera,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Section config ───────────────────────────────────────── */

const sections = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'adding-trades', label: 'Adding Trades', icon: Plus },
  { id: 'importing-trades', label: 'Importing Trades', icon: Upload },
  { id: 'trade-log', label: 'Trade Log', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'goals-rules', label: 'Goals & Rules', icon: Target },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
] as const;

/* ─── Hooks ────────────────────────────────────────────────── */

function useActiveSection() {
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: '-120px 0px -50% 0px', threshold: 0.1 },
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return active;
}

/* ─── Sub-components ───────────────────────────────────────── */

function GuideScreenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="my-6">
        <div
          className="rounded-xl border border-border/50 overflow-hidden cursor-zoom-in hover:border-primary/30 transition-colors"
          onClick={() => setOpen(true)}
        >
          <img src={src} alt={alt} loading="lazy" decoding="async" className="w-full h-auto" />
        </div>
        {caption && (
          <figcaption className="mt-2 text-sm text-muted-foreground text-center italic">{caption}</figcaption>
        )}
      </figure>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-auto">
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-background/80 hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={src} alt={alt} className="w-full h-auto" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex gap-4 p-4 sm:p-5 rounded-xl bg-card/50 border border-border/50">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-primary">{step}</span>
      </div>
      <div>
        <h4 className="font-medium text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function TipBox({
  type = 'tip',
  children,
}: {
  type?: 'tip' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  const config = {
    tip: { border: 'border-l-success', icon: Lightbulb, iconColor: 'text-success', label: 'Pro Tip' },
    warning: { border: 'border-l-warning', icon: AlertTriangle, iconColor: 'text-warning', label: 'Heads Up' },
    info: { border: 'border-l-info', icon: Info, iconColor: 'text-info', label: 'Note' },
  }[type];

  const Icon = config.icon;

  return (
    <div className={cn('my-6 p-4 rounded-r-xl bg-card/30 border border-border/50 border-l-4', config.border)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', config.iconColor)} />
        <span className={cn('text-sm font-semibold', config.iconColor)}>{config.label}</span>
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded bg-muted border border-border text-xs font-mono text-foreground">
      {children}
    </kbd>
  );
}

function FeatureGrid({ items }: { items: { icon: React.ElementType; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
      {items.map((item) => (
        <div key={item.title} className="flex gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
          <item.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-foreground mb-0.5">{item.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionWrapper({
  id,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

/* ─── TOC ──────────────────────────────────────────────────── */

function GuideTOC({ variant, active }: { variant: 'vertical' | 'horizontal'; active: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    if (variant === 'horizontal' && activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [active, variant]);

  if (variant === 'vertical') {
    return (
      <nav aria-label="Guide navigation" className="bg-card/50 rounded-2xl border border-border/50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">Contents</h3>
        <ul className="space-y-0.5">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      ref={scrollRef}
      aria-label="Guide navigation"
      className="flex gap-2 overflow-x-auto py-3 px-4 scrollbar-hide"
    >
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => scrollTo(s.id)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
              isActive
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'text-muted-foreground border-border/50 hover:text-foreground hover:border-border',
            )}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── Section Content ──────────────────────────────────────── */

function GettingStartedSection() {
  return (
    <SectionWrapper id="getting-started" title="Getting Started" subtitle="Set up your account in under 2 minutes" icon={Rocket}>
      <p className="text-muted-foreground leading-relaxed">
        TradeQut is a professional trading journal that helps you track, analyze, and improve your trading performance.
        Here's how to get started.
      </p>

      <div className="space-y-3">
        <StepCard step={1} title="Create Your Account" description="Sign up with your email and password, or use Google OAuth for instant access. You'll receive a 6-digit verification code to confirm your email." />
        <StepCard step={2} title="Log In to Your Dashboard" description="After verifying your email, log in to access your personal dashboard. You'll be greeted with a clean workspace ready for your first trade." />
        <StepCard step={3} title="Create a Trading Account" description="Navigate to Accounts and create your first trading account. Choose from Prop Challenge, Prop Funded, Personal, or Demo. Set your broker name, initial balance, and currency." />
      </div>

      <GuideScreenshot src="/guide/accounts.png" alt="Accounts management page" caption="Manage multiple trading accounts from one place" />

      <TipBox type="tip">
        You can manage multiple accounts simultaneously — perfect for tracking prop firm challenges alongside your personal trading.
      </TipBox>

      <div className="mt-4">
        <h3 className="text-lg font-medium text-foreground mb-3">Navigating the App</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The sidebar gives you quick access to every section. On desktop, it stays expanded with labels. On tablets, it auto-collapses
          to icons. On mobile, tap the hamburger menu to open the navigation drawer.
        </p>
        <GuideScreenshot src="/guide/sidebar.png" alt="Sidebar navigation" caption="Sidebar with all navigation options" />
        <TipBox type="info">
          Use keyboard shortcuts <Kbd>1</Kbd> through <Kbd>6</Kbd> to jump between views instantly.
          Press <Kbd>Cmd</Kbd>+<Kbd>[</Kbd> to collapse or expand the sidebar.
        </TipBox>
      </div>
    </SectionWrapper>
  );
}

function DashboardSection() {
  return (
    <SectionWrapper id="dashboard" title="Dashboard" subtitle="Your trading performance at a glance" icon={LayoutDashboard}>
      <p className="text-muted-foreground leading-relaxed">
        The dashboard is your home base — showing key performance metrics, your equity curve, and recent trades.
        Everything updates in real-time as you add or modify trades.
      </p>

      <GuideScreenshot src="/guide/dashboard.png" alt="Dashboard overview" caption="Dashboard with stat cards, filters, and equity curve" />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Performance Metrics</h3>
      <FeatureGrid items={[
        { icon: TrendingUp, title: 'Total P&L', desc: 'Your net profit or loss across all trades in the selected period. Color-coded green for profit, red for loss.' },
        { icon: Target, title: 'Win Rate', desc: 'Percentage of winning trades. A win rate above 50% is highlighted in green.' },
        { icon: BarChart3, title: 'Total Trades', desc: 'The number of closed trades in the selected period, with trend comparison to prior period.' },
        { icon: Shield, title: 'Profit Factor', desc: 'Gross profit divided by gross loss. Values above 1.0 mean you\'re profitable. Shows "infinity" if you have zero losses.' },
      ]} />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Filtering Your Data</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Use the date range presets at the top to filter by <strong className="text-foreground">7 days</strong>, <strong className="text-foreground">30 days</strong>, <strong className="text-foreground">60 days</strong>, <strong className="text-foreground">90 days</strong>, <strong className="text-foreground">1 year</strong>, <strong className="text-foreground">all time</strong>, <strong className="text-foreground">this week</strong>, or <strong className="text-foreground">this month</strong>.
        You can also pick a custom date range with the calendar picker. The account dropdown lets you view stats for a specific
        account or all accounts combined.
      </p>

      <TipBox type="tip">
        Click the refresh button in the top-right corner to manually reload your data. The icon spins while fetching.
      </TipBox>
    </SectionWrapper>
  );
}

function AddingTradesSection() {
  return (
    <SectionWrapper id="adding-trades" title="Adding Trades" subtitle="Log every trade with full context" icon={Plus}>
      <p className="text-muted-foreground leading-relaxed">
        Click the <strong className="text-foreground">+ Add Trade</strong> button from the dashboard or trade log to open the trade entry form.
        The form is organized into collapsible sections so you can focus on what matters.
      </p>

      <GuideScreenshot src="/guide/add-trade.png" alt="Add Trade modal" caption="Core trade details: direction, prices, dates, and P&L" />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Required Fields</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Field</th>
              <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Symbol</td><td className="py-2">The instrument you traded (e.g., EURUSD, XAUUSD, NAS100)</td></tr>
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Direction</td><td className="py-2">LONG (buy) or SHORT (sell)</td></tr>
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Entry / Exit Price</td><td className="py-2">The price at which you entered and exited the trade</td></tr>
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Size</td><td className="py-2">Position size in lots</td></tr>
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Entry / Exit Date</td><td className="py-2">When the trade was opened and closed</td></tr>
            <tr className="border-b border-border/30"><td className="py-2 pr-4 text-foreground font-medium">Net P&L</td><td className="py-2">Auto-calculated, or enter manually</td></tr>
            <tr><td className="py-2 pr-4 text-foreground font-medium">Outcome</td><td className="py-2">TP (take profit), SL (stop loss), PARTIAL, or BREAKEVEN</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Auto P&L Calculation</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        As you fill in the entry price, exit price, and size, the P&L is calculated automatically:
      </p>
      <div className="my-3 p-4 rounded-xl bg-muted/30 border border-border/50 font-mono text-sm text-center text-foreground">
        P&L = (Exit Price - Entry Price) x Size x Direction
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        You can override this by typing a value directly into the Net P&L field. A <strong className="text-foreground">"Manual override active"</strong> label
        will appear to confirm your manual entry is being used.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Optional Sections</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Expand the collapsible sections to add rich context to your trades:
      </p>

      <GuideScreenshot src="/guide/add-trade-context.png" alt="Add Trade context and analysis" caption="Optional sections: Trade Context, Analysis, Notes, and Images" />

      <FeatureGrid items={[
        { icon: BarChart3, title: 'Trade Context', desc: 'Strategy, trading session (London, Tokyo, US), and market condition (trending, ranging, choppy).' },
        { icon: Lightbulb, title: 'Analysis', desc: 'News/events, key lessons learned, mistakes made, and broken trading rules.' },
        { icon: FileText, title: 'Trade Notes', desc: 'Free-form text notes with AI-powered text enhancement to improve clarity.' },
        { icon: Camera, title: 'Visual Evidence', desc: 'Attach chart screenshots with timeframe labels (1M, 5M, 15M, 1H, 4H, D, W, M) and descriptions.' },
      ]} />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Multi-Account Support</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        When adding a new trade, you can select one or more accounts. A copy of the trade is created for each selected account.
        When editing an existing trade, you'll see the current account with a <strong className="text-foreground">"Current"</strong> badge,
        plus an option to add it to additional accounts.
      </p>

      <TipBox type="info">
        <strong>Draft persistence:</strong> If you close the form without saving, your data is saved automatically.
        Reopen the form and you'll see a "Discard draft" option to restore or clear your work.
      </TipBox>
    </SectionWrapper>
  );
}

function ImportingTradesSection() {
  return (
    <SectionWrapper id="importing-trades" title="Importing Trades" subtitle="Bulk import from files, screenshots, or clipboard" icon={Upload}>
      <p className="text-muted-foreground leading-relaxed">
        Click the <strong className="text-foreground">Import</strong> button to open the import modal. TradeQut supports three import methods,
        all powered by AI extraction.
      </p>

      <GuideScreenshot src="/guide/import-trades.png" alt="Import Trades modal" caption="Import trades from files, images, or clipboard" />

      <div className="space-y-3">
        <StepCard step={1} title="Upload Your Data" description="Drag and drop or select files. Supports CSV, TXT, XLS, XLSX files (up to 1 MB), trade screenshot images (PNG, JPG), or paste data directly from your clipboard." />
        <StepCard step={2} title="AI Extraction" description="Click 'Extract Trades' and the AI will parse your file or screenshots to identify trade data. The extracted trades appear in an editable table." />
        <StepCard step={3} title="Review & Edit" description="Click the pencil icon on any row to edit fields inline. You can also select multiple trades and merge them (same direction only) or delete unwanted rows." />
        <StepCard step={4} title="Save to Account" description="Select one or more accounts at the bottom, then click 'Save'. Trades are created under the selected accounts." />
      </div>

      <TipBox type="warning">
        Always verify AI-extracted data before saving. Check that prices, dates, and P&L values match your actual trades.
        The AI does its best, but numbers from screenshots can sometimes be misread.
      </TipBox>

      <TipBox type="info">
        A maximum of 50 trades can be imported at once. If your file has more rows, only the first 50 will be extracted.
      </TipBox>
    </SectionWrapper>
  );
}

function TradeLogSection() {
  return (
    <SectionWrapper id="trade-log" title="Trade Log" subtitle="View, filter, and manage all your trades" icon={BookOpen}>
      <p className="text-muted-foreground leading-relaxed">
        The Trade Log is your central trade database with two views: a powerful <strong className="text-foreground">Table</strong> view
        and a visual <strong className="text-foreground">Calendar</strong> view.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Table View</h3>
      <GuideScreenshot src="/guide/tradelog-table.png" alt="Trade Log table" caption="Sortable, filterable table with all your trades" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        The table displays your trades with columns for Symbol, Account, Direction, Entry/Exit prices, Size, Risk:Reward, Outcome, and P&L.
        Click any column header to sort ascending or descending — your sort preference is saved automatically.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Customizable Columns</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
        Click the <strong className="text-foreground">Columns</strong> button to show or hide columns. Additional columns include
        Strategy, Session, Mistakes, and Key Lesson. Your column preferences are saved to localStorage.
      </p>
      <GuideScreenshot src="/guide/column-toggle.png" alt="Column visibility toggle" caption="Toggle column visibility with the Columns button" />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Row Actions</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Each trade row has an actions menu (<strong className="text-foreground">...</strong>) with three options:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2 ml-2">
        <li><strong className="text-foreground">View Details</strong> — Opens the full trade detail modal with images, notes, and analytics</li>
        <li><strong className="text-foreground">Edit Trade</strong> — Opens the trade in the edit form to update any field</li>
        <li><strong className="text-foreground">Delete</strong> — Permanently removes the trade after confirmation</li>
      </ul>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Bulk Actions</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Use the checkbox on each row (or the header checkbox to select all) to perform bulk operations.
        A toolbar appears showing the count of selected trades and a <strong className="text-foreground">Delete Selected</strong> button.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Calendar View</h3>
      <GuideScreenshot src="/guide/tradelog-calendar.png" alt="Calendar view" caption="Monthly calendar showing daily P&L and weekly summaries" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        Switch to the <strong className="text-foreground">Calendar</strong> tab to see your trades plotted on a monthly grid.
        Each day shows the total P&L (green for profit, red for loss) and the trade count.
        The weekly column on the right shows aggregate stats per week. Click on any day with trades to drill into the details.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Trade Detail Modal</h3>
      <GuideScreenshot src="/guide/view-trade.png" alt="Trade detail modal" caption="Full trade details with images, notes, mistakes, and key lessons" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        The trade detail modal shows everything about a trade: symbol, direction, P&L, all price levels, dates,
        session, strategy, notes, mistakes (as red badges), key lessons, and attached screenshots.
        Use the <strong className="text-foreground">Prev/Next</strong> buttons to navigate between trades without closing the modal.
      </p>

      <TipBox type="tip">
        Click on any trade screenshot in the detail view to open the full-screen image viewer with zoom, pan, and scroll controls.
      </TipBox>
    </SectionWrapper>
  );
}

function AnalyticsSection() {
  return (
    <SectionWrapper id="analytics" title="Analytics" subtitle="Deep insights into your trading patterns" icon={TrendingUp}>
      <p className="text-muted-foreground leading-relaxed">
        The Analytics page transforms your trade data into actionable insights. It shows 12 performance metrics,
        8 chart types, and an insights section that highlights your most common mistakes and lessons.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Performance Metrics</h3>
      <GuideScreenshot src="/guide/analytics-metrics.png" alt="Analytics metrics grid" caption="12 key performance metrics at a glance" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        The top of the analytics page shows 12 metric cards including Total P&L, Win Rate, Profit Factor,
        Average Win/Loss, Max Drawdown, Best/Worst Trade, Average Risk:Reward, Total Trades, and Win/Loss Streaks.
        Each card is color-coded — green for positive metrics, red for concerning ones.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Charts & Visualizations</h3>
      <GuideScreenshot src="/guide/analytics-charts.png" alt="Analytics charts" caption="Equity curve and daily P&L charts" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        TradeQut provides 8 chart types to help you spot patterns:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2 ml-2">
        <li><strong className="text-foreground">Equity Curve</strong> — Cumulative P&L over time</li>
        <li><strong className="text-foreground">Daily P&L</strong> — Bar chart of daily profit and loss</li>
        <li><strong className="text-foreground">Hourly Win Rate</strong> — When you trade best (by hour)</li>
        <li><strong className="text-foreground">Daily Win Rate</strong> — Your best trading days of the week</li>
        <li><strong className="text-foreground">Trade Duration</strong> — How long you hold trades</li>
        <li><strong className="text-foreground">Symbol Distribution</strong> — Which instruments you trade most</li>
        <li><strong className="text-foreground">Strategy Distribution</strong> — Which strategies you use</li>
        <li><strong className="text-foreground">Session Performance</strong> — Performance by trading session</li>
      </ul>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Insights</h3>
      <GuideScreenshot src="/guide/analytics-insights.png" alt="Analytics insights" caption="Top mistakes, broken rules, and key lessons with P&L impact" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        The Insights section at the bottom reveals patterns in your behavior:
      </p>
      <FeatureGrid items={[
        { icon: AlertTriangle, title: 'Top Mistakes', desc: 'Your most frequent mistakes ranked by count and P&L impact. See exactly how much each mistake costs you.' },
        { icon: Shield, title: 'Broken Rules', desc: 'Trading rules you break most often, with frequency and financial impact.' },
        { icon: Lightbulb, title: 'Key Lessons', desc: 'The lessons you\'ve recorded most, helping reinforce what you\'ve learned.' },
      ]} />

      <TipBox type="tip">
        Analytics charts require at least 3 trades to display. For meaningful patterns and reliable insights, aim for 20+ trades in your selected period.
      </TipBox>
    </SectionWrapper>
  );
}

function GoalsRulesSection() {
  return (
    <SectionWrapper id="goals-rules" title="Goals & Rules" subtitle="Set targets and maintain discipline" icon={Target}>
      <p className="text-muted-foreground leading-relaxed">
        The Goals & Rules page helps you set measurable trading targets and define rules to keep yourself disciplined.
        Track your progress weekly or monthly.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Trading Goals</h3>
      <GuideScreenshot src="/guide/goals-weekly.png" alt="Goals weekly view" caption="Weekly goals with progress bars and period navigation" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        TradeQut tracks 4 goal types, each with a progress bar showing how close you are to your target:
      </p>
      <FeatureGrid items={[
        { icon: TrendingUp, title: 'Profit Target', desc: 'Set a dollar amount you want to earn this period. Progress shows your current P&L vs. target.' },
        { icon: Target, title: 'Win Rate', desc: 'Target win rate percentage. Progress updates automatically as you close trades.' },
        { icon: AlertTriangle, title: 'Max Drawdown', desc: 'Maximum acceptable drawdown. This is an inverse goal — staying under the limit means success.' },
        { icon: BarChart3, title: 'Max Trades', desc: 'Limit the number of trades per period. Another inverse goal to prevent overtrading.' },
      ]} />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        Switch between <strong className="text-foreground">Weekly</strong> and <strong className="text-foreground">Monthly</strong> tabs,
        and use the arrow buttons to navigate to past periods. Click the pencil icon on any goal card to edit the target value.
      </p>

      <TipBox type="info">
        Past periods are read-only — you can review your historical performance but can't modify targets retroactively.
        A banner will inform you when you're viewing a past period.
      </TipBox>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Trading Rules</h3>
      <GuideScreenshot src="/guide/goals-rules.png" alt="Trading rules" caption="Define and track trading rules with compliance indicators" />

      <p className="text-sm text-muted-foreground leading-relaxed mt-4">
        Below the goals, you'll find your Trading Rules section. Each rule shows a green check (followed) or red X (broken).
        The compliance counter tells you how many rules you're following at a glance.
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2 ml-2">
        <li><strong className="text-foreground">Add rules</strong> — Click "+ Add Rule" and type your rule (e.g., "Never revenge trade")</li>
        <li><strong className="text-foreground">Edit rules</strong> — Hover and click the pencil icon to modify the text</li>
        <li><strong className="text-foreground">Delete rules</strong> — Hover and click the trash icon. Rules that are broken in existing trades cannot be deleted</li>
        <li><strong className="text-foreground">Mark as broken</strong> — When adding a trade, select broken rules in the Analysis section</li>
      </ul>

      <TipBox type="tip">
        Your broken rules appear in the Analytics insights section, showing you how often each rule is broken and its P&L impact.
        This creates a powerful feedback loop for improving discipline.
      </TipBox>
    </SectionWrapper>
  );
}

function SettingsSection() {
  return (
    <SectionWrapper id="settings" title="Settings" subtitle="Customize your dropdown options and preferences" icon={Settings}>
      <p className="text-muted-foreground leading-relaxed">
        The Settings page lets you manage the dropdown options that appear throughout the app — in the Add Trade form,
        filters, and analytics breakdowns.
      </p>

      <GuideScreenshot src="/guide/settings.png" alt="Settings page" caption="Manage dropdown options for strategies, sessions, and more" />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Configurable Option Lists</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Each section lets you add new options, remove existing ones, and reset to defaults:
      </p>
      <FeatureGrid items={[
        { icon: BarChart3, title: 'Strategies / Setups', desc: 'Trading strategies like Breakout, Reversal, Trend Follow, Scalp, etc.' },
        { icon: Calendar, title: 'Trading Sessions', desc: 'Market sessions such as London, Tokyo, US, Sydney, or custom sessions.' },
        { icon: TrendingUp, title: 'Market Conditions', desc: 'Conditions like Trending, Ranging, Choppy, High Volatility, News-driven.' },
        { icon: FileText, title: 'News Events', desc: 'Economic events like NFP, FOMC, CPI, Earnings that affect your trades.' },
        { icon: AlertTriangle, title: 'Common Mistakes', desc: 'Your trading mistakes: FOMO, Late Entry, No Stop Loss, Overtrading, etc.' },
      ]} />

      <TipBox type="info">
        Options you add here will appear in the dropdowns when adding trades. You can also add new options
        on-the-fly directly from the Add Trade form using the "Add New" option in any dropdown.
      </TipBox>
    </SectionWrapper>
  );
}

function ProfileSection() {
  return (
    <SectionWrapper id="profile" title="Profile" subtitle="Your account info and subscription" icon={User}>
      <p className="text-muted-foreground leading-relaxed">
        The Profile page shows your personal information and subscription status.
      </p>

      <GuideScreenshot src="/guide/profile.png" alt="Profile page" caption="Personal information and subscription management" />

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Personal Information</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        View your avatar, display name, email address, and "Member since" date. Click the edit button to update your display name —
        the change will be reflected across the app, including the sidebar.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Subscription</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Check your current plan status and manage your subscription. Toggle between Monthly and Annual billing
        to see available plans and pricing. Annual plans save 17% compared to monthly billing.
      </p>

      <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Logging Out</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Click the <strong className="text-foreground">Log Out</strong> button at the bottom of the Profile page. A confirmation dialog
        will appear before you're signed out and redirected to the login page.
      </p>
    </SectionWrapper>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */

export function GuidePage() {
  const active = useActiveSection();

  // Scroll to hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeQut</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <Button asChild className="gap-2 hidden sm:inline-flex">
              <Link to="/signup">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 sm:pt-32 pb-10 sm:pb-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            Complete User Guide
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How to Use TradeQut
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know to track, analyze, and improve your trading performance.
            From your first login to advanced analytics.
          </p>
        </div>
      </section>

      {/* Mobile TOC */}
      <div className="lg:hidden sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <GuideTOC variant="horizontal" active={active} />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* Desktop sidebar TOC */}
          <aside className="hidden lg:block self-start sticky top-24">
            <GuideTOC variant="vertical" active={active} />
          </aside>

          {/* Content */}
          <div className="space-y-16 lg:space-y-20 pt-6 lg:pt-0">
            <GettingStartedSection />
            <DashboardSection />
            <AddingTradesSection />
            <ImportingTradesSection />
            <TradeLogSection />
            <AnalyticsSection />
            <GoalsRulesSection />
            <SettingsSection />
            <ProfileSection />

            {/* CTA */}
            <div className="text-center py-12 border-t border-border/50">
              <h2 className="text-2xl font-semibold text-foreground mb-3">Ready to start?</h2>
              <p className="text-muted-foreground mb-6">Create your free account and start journaling your trades today.</p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/signup">
                  Get Started Free
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} TradeQut. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
