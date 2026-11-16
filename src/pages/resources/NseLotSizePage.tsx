import type { ReactNode } from 'react';
import { ContentPageShell } from '@/components/content/ContentPageShell';
import { ContractValueCalculator, NseLotExplorer } from '@/components/content/NseLotExplorer';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, H3, P, RelatedLinks, ShortAnswer, SignupCta, Sources, Table } from '@/content/components/ArticleParts';
import {
  FREEZE_LIMITS,
  INDEX_COLUMNS,
  INDEX_LOT_CIRCULARS,
  LOT_DATA_CHECKED,
  NSE_CONTRACT_INFO_URL,
  NSE_COPYRIGHT_URL,
  NSE_LOT_FILE_URL,
  NSE_TERMS_URL,
  STOCK_LOT_CIRCULARS,
  type LotChange,
} from '@/content/nse-lot-circulars';
import type { FaqItem } from '@/content/product-facts';
import { calculatorSchema } from '@/config/seo';
import { formatDay } from '@/lib/nseLotFile';

const PATH = '/resources/nse-lot-size';
const NAME = 'NSE F&O lot size lookup';
const TITLE = 'NSE F&O lot sizes by expiry month and revisions | TradeQut';
const DESCRIPTION =
  "Look up NSE F&O lot sizes by expiry month in NSE's own file, with the index lot revisions since 2021 and the NSE circular behind each one.";

const checked = formatDay(LOT_DATA_CHECKED);
const latest = INDEX_LOT_CIRCULARS[0];

const FAQ: FaqItem[] = [
  {
    question: 'What happens to a Nifty contract I already hold when NSE changes the lot size?',
    answer:
      'It depends on the contract and on the circular, so read the rule in the circular. Under NSE/FAOP/70616 (3 Oct 2025) existing weekly and monthly contracts kept the old lot of 75 until the 30 Dec 2025 expiry, and the lot of existing quarterly and half-yearly contracts changed to 65 at the end of the day on 30 Dec 2025. NSE/FAOP/64625 (18 Oct 2024) set the same pattern for the move to 75. The circulars do not say how a broker treats a position that is open at a changeover; ask your broker.',
  },
  {
    question: 'Which points of the October 2025 circular apply to existing weekly contracts?',
    answer:
      'For Nifty weekly contracts the last expiry at the old lot of 75 was 23 Dec 2025 and the first at the new lot of 65 was 6 Jan 2026. Existing monthly contracts on Nifty, Nifty Bank, Nifty Financial Services and Nifty Mid Select kept the old lot until the 30 Dec 2025 expiry; the first monthly expiry at the new lot was 27 Jan 2026. The table above gives the old and new lot of each index.',
  },
  {
    question: 'Where can I get the lot sizes of all F&O stocks as a CSV or Excel file?',
    answer:
      "NSE publishes fo_mktlots.csv, linked in step 1 of the lookup above: the indices first, then the stocks, with one column per expiry month. Download it and load it on this page to search it by name or symbol. NSE's circulars also point to the contract file NSE_FO_contract_ddmmyyyy.csv.gz on the All Reports - Derivatives page of nseindia.com.",
  },
  {
    question: 'What was the Nifty lot size in each year?',
    answer:
      'From the circulars: 75 before the March 2021 circular; 50 from the July 2021 monthly and August 2021 weekly contracts (NSE/FAOP/47854); 25 for every contract available from 26 Apr 2024 (NSE/FAOP/61415); 75 for new contracts from 20 Nov 2024 (NSE/FAOP/64625), with the first monthly expiry at 75 on 27 Feb 2025; 65 from 28 Oct 2025 (NSE/FAOP/70616), with the first monthly expiry at 65 on 27 Jan 2026. Each change was phased in by contract type, so the lot on a given day depends on the contract. Changes before March 2021 are not on this page.',
  },
  {
    question: 'Why do lot sizes keep changing?',
    answer:
      "NSE revises lots under SEBI's rules. SEBI's circular of 1 Oct 2024, cited in NSE/FAOP/64625, asks that an index derivative contract be worth at least Rs. 15 lakh when introduced and that the lot be set so the contract value on the review day falls between Rs. 15 lakh and Rs. 20 lakh. NSE computes the lot from the average closing price of the underlying over one month, so each review can give a different lot. Later circulars cite SEBI's circular of 30 Dec 2024 on periodic revision of lot sizes.",
  },
  {
    question: 'Is this NSE data, and can I rely on it?',
    answer: `No. TradeQut is not affiliated with NSE. The tables on this page are lot sizes written in the NSE circulars linked in each row, read on ${checked}. Lot sizes from NSE's file appear only after you load that file yourself. Lot sizes change, so check the NSE file before you trade.`,
  },
];

function SourceNote({ children }: { children: ReactNode }) {
  return <p className="-mt-3 mb-6 text-xs text-muted-foreground">{children}</p>;
}

function CircularLink({ circular }: { circular: { ref: string; number: string; url: string } }) {
  return (
    <>
      <A to={circular.url}>{circular.ref}</A>
      <span className="block text-xs">({circular.number})</span>
    </>
  );
}

function LotCell({ change }: { change?: LotChange }) {
  if (!change) return <span className="text-xs">not listed</span>;
  if (change.from === change.to) return <span className="num whitespace-nowrap">{change.to} (unchanged)</span>;
  return (
    <span className="num whitespace-nowrap font-semibold text-foreground">
      {change.from} → {change.to}
    </span>
  );
}

const RuleCell = ({ effective, rule }: { effective: string; rule: string }) => (
  <div className="min-w-72">
    <p className="font-medium text-foreground">{effective}</p>
    <p>{rule}</p>
  </div>
);

const sources = [
  { label: 'NSE F&O lot file, fo_mktlots.csv (the file you load on this page)', url: NSE_LOT_FILE_URL },
  ...INDEX_LOT_CIRCULARS.map((c) => ({ label: `${c.ref} (${c.number}), ${formatDay(c.date)}: revision in market lot of derivative contracts on indices`, url: c.url })),
  ...STOCK_LOT_CIRCULARS.map((c) => ({ label: `${c.ref} (${c.number}), ${formatDay(c.date)}: revision in market lot of derivative contracts on individual stocks`, url: c.url })),
  { label: `${FREEZE_LIMITS.ref} (${FREEZE_LIMITS.number}), ${formatDay(FREEZE_LIMITS.date)}: quantity freeze limits for indices`, url: FREEZE_LIMITS.url },
  { label: 'NSE Terms of Use', url: NSE_TERMS_URL },
  { label: 'NSE Copyright policy', url: NSE_COPYRIGHT_URL },
].map((s) => ({ ...s, checked: LOT_DATA_CHECKED }));

export function NseLotSizePage() {
  return (
    <ContentPageShell
      title={TITLE}
      description={DESCRIPTION}
      path={PATH}
      jsonLd={calculatorSchema(NAME, DESCRIPTION, PATH, FAQ)}
      maxWidth="max-w-5xl"
    >
      <Crumbs parent={{ path: '/resources', label: 'Resources' }} current="NSE F&O lot sizes" />

      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">NSE F&amp;O lot sizes by expiry month, with index revision history</h1>
      <ShortAnswer>
        In the latest index circular we have read ({latest.ref}, {formatDay(latest.date)}) the lots are{' '}
        {INDEX_COLUMNS.map((c) => `${c.name}: ${latest.lots[c.symbol]?.to}`).join(', ')}. NSE&apos;s own lot file, read on {checked}, shows the same
        numbers for the November 2026 expiry. NSE lists every F&amp;O underlying in that file with one column per expiry month. Its terms do not let
        TradeQut republish it, so you load the file below and search it on your device.{' '}
        <strong className="font-semibold">Check the NSE file before trading; lot sizes change.</strong>
      </ShortAnswer>

      <H2 id="lookup">Look up a lot size in NSE&apos;s file</H2>
      <Callout title="Why this page does not list NSE's table">
        NSE&apos;s <A to={NSE_TERMS_URL}>Terms of Use</A> say that no information, content or data on its website may be copied, reproduced or published
        without NSE&apos;s prior written permission, and its <A to={NSE_COPYRIGHT_URL}>copyright page</A> allows downloads for personal, non-commercial or
        educational use. TradeQut is a commercial product, so it does not publish a copy of NSE&apos;s lot table. It links to NSE&apos;s file and reads the
        copy you download, on your device.
      </Callout>
      <NseLotExplorer />

      <H3>Contract value of one lot</H3>
      <ContractValueCalculator />

      <H2 id="index-revisions">Index lot revisions since 2021, with each circular</H2>
      <P>
        Each row is one NSE circular. A lot is shown as the old lot, an arrow and the new lot; &ldquo;unchanged&rdquo; means the circular lists the index
        and leaves its lot as it was.
      </P>
      <Table
        caption="Index lot sizes before and after each NSE revision circular, newest first"
        head={[
          'Circular date',
          'NSE circular',
          ...INDEX_COLUMNS.map((c) => (
            <>
              {c.symbol}
              <span className="block text-xs font-normal text-muted-foreground">{c.name}</span>
            </>
          )),
          'Effective and transition rule',
        ]}
        rows={INDEX_LOT_CIRCULARS.map((c) => [
          <span key="d" className="whitespace-nowrap">{formatDay(c.date)}</span>,
          <CircularLink key="c" circular={c} />,
          ...INDEX_COLUMNS.map((col) => <LotCell key={col.symbol} change={c.lots[col.symbol]} />),
          <RuleCell key="r" effective={c.effective} rule={c.rule} />,
        ])}
      />
      <SourceNote>
        Source: the NSE circulars linked in each row, opened on {checked}. Circulars after {formatDay(latest.date)} and changes before March 2021 are not
        shown. Check the NSE file before trading; lot sizes change.
      </SourceNote>

      <H2 id="stock-revisions">Stock lot revisions in 2026</H2>
      <P>
        For individual stocks NSE publishes the changed lots in an annexure to each circular, as a zip file. This page gives the counts and the transition
        rule; open the circular for the list.
      </P>
      <Table
        caption="NSE circulars revising the lot size of stock derivatives, newest first"
        head={['Circular date', 'NSE circular', 'Lowered', 'Raised', 'Lowered, not a multiple of the old lot', 'Unchanged', 'Effective and transition rule']}
        rows={STOCK_LOT_CIRCULARS.map((c) => [
          <span key="d" className="whitespace-nowrap">{formatDay(c.date)}</span>,
          <CircularLink key="c" circular={c} />,
          <span key="l" className="num">{c.lowered}</span>,
          <span key="r" className="num">{c.raised}</span>,
          <span key="m" className="num">{c.loweredNotMultiple}</span>,
          <span key="u" className="num">{c.unchanged}</span>,
          <RuleCell key="x" effective={c.effective} rule={c.rule} />,
        ])}
      />
      <SourceNote>
        Source: the NSE circulars linked in each row, opened on {checked}. The counts are underlyings in each annexure. Check the NSE file before trading;
        lot sizes change.
      </SourceNote>

      <H2 id="freeze-limits">Index quantity freeze limits from {FREEZE_LIMITS.effective}</H2>
      <P>
        {FREEZE_LIMITS.ref} ({FREEZE_LIMITS.number}, {formatDay(FREEZE_LIMITS.date)}) lists these quantity freeze limits for derivatives on indices,
        applicable from {FREEZE_LIMITS.effective}. The circular states the limits as quantities and refers to NSE&apos;s consolidated F&amp;O circular
        NSE/FAOP/73928 for the method; that circular was not read for this page. Limits for each underlying are on NSE&apos;s{' '}
        <A to={NSE_CONTRACT_INFO_URL}>equity derivatives contract information</A> page.
      </P>
      <Table
        caption={`Quantity freeze limits for indices, ${FREEZE_LIMITS.ref}`}
        head={['Index symbol', 'Quantity freeze limit']}
        rows={FREEZE_LIMITS.rows.map((r) => [r.symbol, <span key={r.symbol} className="num">{r.limit.toLocaleString('en-IN')}</span>])}
      />
      <SourceNote>
        Source: <A to={FREEZE_LIMITS.url}>{FREEZE_LIMITS.ref}</A>, opened on {checked}. NSE revises these limits; check its page before trading.
      </SourceNote>

      <H2 id="how-lots-work">How lot sizes work</H2>
      <P>
        A lot is the fixed number of units one futures or options contract covers, so the quantity of an order is the number of lots × the lot size. The lot
        size belongs to the contract, not to the underlying alone. When NSE revises it, contracts that are already listed can keep the old lot for a time,
        so two lot sizes can be live for the same underlying. The circulars above show how this was handled each time: for example, existing weekly and
        monthly contracts kept the old lot until expiry while quarterly and half-yearly contracts switched on a named date.
      </P>
      <P>
        The revisions follow SEBI&apos;s rules on contract value. NSE&apos;s circular of 18 Oct 2024 quotes SEBI&apos;s requirement that an index
        derivative contract be worth at least Rs. 15 lakh when introduced and that lots be set so the contract value on the review day is between Rs. 15
        lakh and Rs. 20 lakh, and it computes the lot from the average closing price of the index over one month. Later circulars cite SEBI&apos;s circular
        of 30 Dec 2024 on periodic revision of lot sizes.
      </P>

      <Faq items={FAQ} />
      <RelatedLinks
        links={[
          { to: '/resources/position-size', label: 'Position size calculator' },
          { to: '/resources/risk-reward', label: 'Risk-reward calculator' },
          { to: '/fo-trading-journal', label: 'F&O trading journal for Nifty and Bank Nifty' },
        ]}
      />
      <Sources items={sources} />
      <Disclaimer />
      <SignupCta />
    </ContentPageShell>
  );
}
