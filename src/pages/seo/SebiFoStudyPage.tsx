import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Callout, Crumbs, Disclaimer, Faq, H2, P, ShortAnswer, SignupCta, Sources, Table, UL } from '@/content/components/ArticleParts';
import {
  SEBI_CHECKED,
  SEBI_DOCUMENTS,
  SEBI_FIGURES,
  SEBI_GROUPS,
  SEBI_METHOD,
  SEBI_YEARS,
  SEBI_YEAR_DOC,
  SEBI_YEAR_PAGE,
  SEBI_YEAR_WHERE,
  formatSebiDate,
  sebiDoc,
  sebiPdfPageUrl,
  type SebiDocId,
} from '@/content/sebi-fo-study';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const FIGURE_HEAD = ['Figure', 'Value', 'Period', 'SEBI document and date', 'Page / section'];
const STUDIES: SebiDocId[] = ['jan2023', 'jul2024cash', 'sep2024', 'jul2025', 'aug2026profit', 'aug2026behaviour'];

const FAQ = [
  {
    question: 'What percentage of F&O traders lose money, according to SEBI?',
    answer:
      "In SEBI's study of 20 August 2026, 87.7% of individual traders in equity derivatives had a net loss in FY26 and 91.0% had a net loss over FY25 and FY26 together, both after transaction costs. For earlier years SEBI reports 89% for FY22 in its January 2023 study (top 10 brokers) and 90.2% to 91.7% a year for FY22 to FY25 in its later studies (top 13 to 15 brokers).",
  },
  {
    question: "Do SEBI's loss figures include brokerage, STT and other charges?",
    answer:
      "Yes. SEBI's headline loss figures are net losses, after transaction costs, which it lists for FY26 as brokerage, STT, exchange transaction charges, GST, stamp duty and SEBI fees. Before costs, 82.1% of individual traders had a loss in FY26; after costs, 87.7%.",
  },
  {
    question: 'Is the SEBI loss figure about retail traders only?',
    answer:
      "SEBI's group is \"individual traders\": resident individuals, HUFs, NRIs, sole proprietorships and individuals trading through portfolio management services, which SEBI says includes both retail and HNI traders. The profit and loss data come from the top 15 brokers, which account for about 90% of individual traders (89.6% in FY26).",
  },
  {
    question: 'How much did individual traders lose in total?',
    answer:
      "In SEBI's sample of the top 15 brokers, aggregate net losses were ₹91,685 crore in FY26, ₹2.03 lakh crore over FY25 and FY26 together, ₹1,81,383 crore over FY22 to FY24 and about ₹3.85 lakh crore over FY22 to FY26. The sample covers about 90% of individual traders; SEBI notes that if the rest behave alike, losses for all individuals would be about 1.11 times the sample's.",
  },
  {
    question: "Why do the figures differ between SEBI's studies?",
    answer:
      'Each study uses a different broker sample (top 10 brokers in January 2023, top 13 in July 2025, top 15 in September 2024 and August 2026) and covers different years. SEBI also revised FY25 after widening the sample from 13 to 15 brokers: the aggregate net loss changed from ₹1,05,603 crore to ₹1,11,788 crore. When you cite a figure, name the study, the year and the page, as the tables above do.',
  },
  {
    question: 'Does SEBI say a trading journal helps?',
    answer:
      'No. None of the SEBI documents cited on this page analyses trading journals, courses or other tools, so they do not show whether keeping a journal changes results. A journal records your own trades; TradeQut estimates charges on each imported trade and shows your net P&L, so you can see your own numbers next to SEBI\'s.',
  },
  {
    question: 'Is this page from SEBI?',
    answer:
      "No. TradeQut is an independent trading journal. This page is not affiliated with or endorsed by SEBI, and TradeQut is not a SEBI-registered investment adviser or research analyst. It reproduces figures from SEBI's published studies, links to each one and gives no trading advice or recommendations.",
  },
];

function DocCell({ id }: { id: SebiDocId }) {
  const d = sebiDoc(id);
  return (
    <>
      <A to={d.pdfUrl}>{d.label}</A>, {formatSebiDate(d.date)}
    </>
  );
}

function PageLink({ id, page }: { id: SebiDocId; page: number }) {
  return <A to={sebiPdfPageUrl(id, page)}>PDF p. {page}</A>;
}

export default function SebiFoStudyPage() {
  const page = getSeoPage('/sebi-fo-study');
  const checked = formatSebiDate(SEBI_CHECKED);
  return (
    <ContentPageShell
      title={page.title}
      description={page.description}
      path={page.path}
      jsonLd={seoPageSchema(page, [], FAQ)}
      maxWidth="max-w-5xl"
    >
      {page.parent && <Crumbs parent={page.parent} current={page.label} />}
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        SEBI F&amp;O study: how many traders lose money (sourced)
      </h1>
      <ShortAnswer>
        SEBI&apos;s latest study of individual traders in equity derivatives, published on 20 August 2026, found that 87.7%
        of them made a net loss in FY26, after transaction costs, and 91.0% over FY25 and FY26 together. SEBI&apos;s earlier
        studies gave 89% for FY22 and 91.1% for FY24. Every figure on this page is copied from a SEBI document and links to
        the PDF page it comes from. Checked against sebi.gov.in on {checked}.
      </ShortAnswer>
      <P>
        News and blogs quote SEBI&apos;s F&amp;O loss figures as &ldquo;9 out of 10&rdquo;, &ldquo;89%&rdquo;,
        &ldquo;91%&rdquo; or &ldquo;93%&rdquo;. Those numbers come from different SEBI studies that cover different years,
        use different broker samples and count different things. This page puts the figures side by side, each with its
        period, the SEBI document and its date, and the PDF page, so a number can be checked before it is repeated.
      </P>
      <P>
        TradeQut is an independent trading journal. This page is not affiliated with or endorsed by SEBI, and it gives no
        trading advice.
      </P>

      <H2 id="studies">SEBI&apos;s studies of individual traders</H2>
      <Table
        caption="Studies on sebi.gov.in, oldest first"
        head={['SEBI document', 'Published', 'Covers', 'Open']}
        rows={STUDIES.map((id) => {
          const d = sebiDoc(id);
          return [d.title, formatSebiDate(d.date), d.covers, <><A to={d.pdfUrl}>PDF</A>, <A to={d.pageUrl}>SEBI page</A></>];
        })}
      />
      <P>
        SEBI later refers to the January 2023 study as &ldquo;Profits and Losses in the Equity Derivatives Segment
        (FY19&ndash;FY22)&rdquo; (August 2026 profitability study, <PageLink id="aug2026profit" page={11} />). The July 2024
        study is about intraday trading in the cash segment and appears here only as a related figure. The July 2025 study is
        mostly about turnover; its section C has the FY25 profit and loss.
      </P>
      <P>
        As of {checked} the two studies of 20 August 2026 are the latest on this topic that we found: SEBI&apos;s Research
        listing has nothing newer, and its press releases up to 12 November 2026 contain no later F&amp;O study. SEBI also
        issued press releases for the September 2024 study (PR No. 22/2024) and the August 2026 studies (PR No. 50/2026);
        they are in the sources below.
      </P>

      <H2 id="year-by-year">Year by year: the latest SEBI series</H2>
      <Table
        caption={`Individual traders in equity derivatives, sample of the top 15 brokers. SEBI, ${sebiDoc(SEBI_YEAR_DOC).label}, ${formatSebiDate(sebiDoc(SEBI_YEAR_DOC).date)}, ${SEBI_YEAR_WHERE}`}
        head={['Financial year', 'Traders in the sample (lakh)', 'Share with a net loss', 'Aggregate net loss (₹ crore)', 'Average net loss per trader (₹)']}
        rows={SEBI_YEARS.map((y) => [y.year, y.sampleLakh, y.lossMakersPct, y.netLossCrore, y.avgNetLossRupees])}
      />
      <P>
        Source: <PageLink id={SEBI_YEAR_DOC} page={SEBI_YEAR_PAGE} />. Notes on the series, each from SEBI&apos;s own text:
      </P>
      <UL>
        <li>
          FY25 was first published as ₹1,05,603 crore with 91.0% loss-makers, from the top 13 brokers (July 2025 study,{' '}
          <PageLink id="jul2025" page={6} />). SEBI revised it after widening the sample to 15 brokers (August 2026 profitability
          study, <PageLink id="aug2026profit" page={5} />, note 2).
        </li>
        <li>
          FY23 is printed as 91.5% in the text of the September 2024 study (<PageLink id="sep2024" page={15} />) and as 91.7% in
          the table above and in the July 2025 study (<PageLink id="jul2025" page={6} />).
        </li>
        <li>
          The sample covers about 90% of individual traders. SEBI says that if the rest behave alike, losses for all
          individuals would be about 1.11 times these (<PageLink id="aug2026profit" page={47} />).
        </li>
      </UL>

      <H2 id="figures">The figures, with their sources</H2>
      <P>
        A loss means a net loss, after transaction costs, unless a row says otherwise. Page numbers are PDF page numbers, as
        a PDF viewer counts them, and each link opens that page of SEBI&apos;s PDF. In the September 2024 study the printed
        footer is one lower than the PDF page.
      </P>
      {SEBI_GROUPS.map((g) => (
        <Table
          key={g.id}
          caption={g.caption}
          head={FIGURE_HEAD}
          rows={SEBI_FIGURES.filter((f) => f.group === g.id).map((f) => [
            f.figure,
            <strong key="v" className="text-foreground">
              {f.value}
            </strong>,
            f.period,
            <DocCell key="d" id={f.doc} />,
            <>
              <PageLink id={f.doc} page={f.pdfPage} />, {f.where}
            </>,
          ])}
        />
      ))}

      <H2 id="methodology">Methodology: what each study measured</H2>
      <Table
        caption="Who is counted and how a loss is measured, in SEBI's words and numbers"
        head={['Study and years', 'Who is counted', 'How a loss is measured', 'Data', 'Pages']}
        rows={SEBI_METHOD.map((m) => [
          <>
            <A to={sebiDoc(m.doc).pdfUrl}>{sebiDoc(m.doc).label}</A>: {m.years}
          </>,
          m.who,
          m.basis,
          m.data,
          <>
            {m.pdfPages.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <PageLink id={m.doc} page={p} />
              </span>
            ))}
          </>,
        ])}
      />
      <Callout title="Why the numbers differ between studies">
        <UL>
          <li>
            The broker samples differ: top 10 brokers in January 2023, top 13 in July 2025, top 15 in September 2024 and August
            2026. That is why FY22 is 89% in the first study and 90.2% in the later ones.
          </li>
          <li>
            The September 2024 study has a whole-market section that is gross of costs; SEBI says it is not strictly
            comparable with its sample section (<PageLink id="sep2024" page={11} />).
          </li>
          <li>
            Press releases round: the headline of PR No. 22/2024 says 93%, while the study gives 92.8% for FY22&ndash;FY24 (
            <PageLink id="sep2024pr" page={1} /> and <PageLink id="sep2024" page={19} />).
          </li>
          <li>
            Averages are defined differently in places. Under Chart 5 of the September 2024 study SEBI notes that the
            loss-makers there are classified on gross profit or loss, while its headline loss share is on net loss (
            <PageLink id="sep2024" page={16} />). Compare an average only within one document.
          </li>
        </UL>
      </Callout>

      <H2 id="says">What the studies say</H2>
      <UL>
        <li>
          <strong>Most individual traders had a net loss in every year SEBI measured.</strong> The share is 89% for FY22
          (January 2023 study), between 90.2% and 91.7% a year for FY22 to FY25 in the later studies, and 87.7% for FY26.
          Over FY25 and FY26 together it is 91.0%.
        </li>
        <li>
          <strong>The losses are almost all in options.</strong> Options accounted for 92% of aggregate individual losses in
          FY26. About 66% of individual futures traders and 87.7% of options traders had a net loss.
        </li>
        <li>
          <strong>Costs are part of the result.</strong> Before transaction costs 82.1% of individual traders had a loss in
          FY26; after costs, 87.7%. Costs were about ₹24,800 crore a year in FY25 and FY26. In FY26 they equalled 35% of the
          gross losses of loss-makers and 21% of the gross profits of profit-makers.
        </li>
        <li>
          <strong>Losses repeat among those who keep trading.</strong> Of continuing traders who had lost in each of the two
          years before, 90.0% lost again in FY26.
        </li>
        <li>
          <strong>Few traders earned large profits.</strong> About 1.1% earned more than ₹1 lakh over FY25 and FY26, while
          about 4.4 lakh traders (about 3.5%) each lost more than ₹10 lakh.
        </li>
        <li>
          <strong>In total,</strong> individual traders in the sample lost ₹91,685 crore in FY26 and ₹2.03 lakh crore over
          FY25 and FY26.
        </li>
      </UL>

      <H2 id="does-not-say">What the studies do not say</H2>
      <UL>
        <li>They do not predict any one trader&apos;s result. They describe groups of individual traders in past years.</li>
        <li>
          They measure realised profit and loss. Positions still open at the end of a period are excluded (August 2026
          profitability study, <PageLink id="aug2026profit" page={18} />).
        </li>
        <li>
          They cover a sample: the top 15 brokers account for about 90% of individual traders, so roughly one in ten is not
          in the data.
        </li>
        <li>
          They do not show cause and effect. SEBI states that its analysis is descriptive and does not establish
          cause-and-effect relationships (<PageLink id="aug2026profit" page={17} />).
        </li>
        <li>
          A lower loss share in FY26 does not mean outcomes improved. SEBI cautions that the year also saw a 20% drop in the
          number of active traders (<PageLink id="aug2026profit" page={47} />).
        </li>
        <li>
          They are not about retail traders only. SEBI&apos;s &ldquo;individual&rdquo; group includes HUFs, NRIs, sole
          proprietorships and individuals under portfolio management services, and in SEBI&apos;s words both retail and HNI
          traders (<PageLink id="aug2026profit" page={5} />).
        </li>
        <li>
          They give no trading advice, and none of the SEBI documents cited here analyses trading journals, courses or other
          tools, so they do not show whether keeping a journal changes results.
        </li>
      </UL>

      <H2 id="journal">How a journal helps you see your own costs</H2>
      <P>
        SEBI&apos;s headline figures are measured after transaction costs, and its own numbers show how much costs matter: in
        FY26, 82.1% of individual traders had a loss before costs and 87.7% after them, and costs were 35% of loss-makers&apos;
        gross losses. A journal can show the same split for your own trades: gross P&amp;L, charges and net P&amp;L.
      </P>
      <P>
        TradeQut imports the trade file from Zerodha, Dhan, Upstox, Angel One or Groww, estimates brokerage, STT, exchange
        charges, SEBI fee, stamp duty and GST for each trade from a dated table of rates (exact to the trade date for NSE
        trades from 1 October 2024, an approximation of the transaction charge before that, and without STT on options
        exercised at expiry), and shows net P&amp;L by calls and puts, expiry day, weekday and hour. The charges are estimates from published rates; your contract note
        is the authoritative figure. Goals &amp; rules records the rules you set and what each broken rule cost.
      </P>
      <P>
        The <A to="/fo-trading-journal">F&amp;O trading journal</A> page shows what is recorded on each trade,{' '}
        <A to="/blog/fo-trading-charges-india">F&amp;O charges in India</A> has a worked example of the charges on one options
        trade, and <A to="/blog/options-trading-journal-india">the options journal fields</A> list what to write down.
      </P>
      <Callout title="What TradeQut does not claim">
        The SEBI studies do not test journals, and TradeQut does not claim that using one changes the figures above. It
        analyses your own past trades, gives no tips, signals or strike recommendations, and is not a SEBI-registered
        investment adviser.
      </Callout>

      <Faq items={FAQ} />
      <Sources
        items={SEBI_DOCUMENTS.map((d) => ({
          label: `${d.title}. SEBI ${d.kind.toLowerCase()}, ${formatSebiDate(d.date)} (PDF)`,
          url: d.pdfUrl,
          checked: SEBI_CHECKED,
        }))}
      />
      <P>Last checked against sebi.gov.in: {checked}.</P>
      <Disclaimer />
      <SignupCta />
    </ContentPageShell>
  );
}
