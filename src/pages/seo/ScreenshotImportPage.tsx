import { ContentPageShell } from '@/components/content/ContentPageShell';
import { A, Callout, Disclaimer, Faq, H2, OL, P, ShortAnswer, SignupCta, Table, UL } from '@/content/components/ArticleParts';
import { PLAN_LIMITS, TRIAL_DAYS, proPrice } from '@/content/product-facts';
import { getSeoPage } from '@/content/seo-pages';
import { seoPageSchema } from '@/config/seo';

const usdMonth = proPrice('USD', 'month').display;
const inrMonth = proPrice('INR', 'month').display;
const extraction = PLAN_LIMITS.find((r) => r.feature === 'AI extraction from screenshots/files');

const FAQ = [
  {
    question: 'Can I import trades into a journal from a screenshot?',
    answer:
      'Yes. On the TradeQut Import page you upload or paste screenshots of a trade list (PNG, JPG or WebP, up to 1 MB each, up to 15 at a time). AI extraction reads the trades and shows them in a review table next to the screenshot each row came from, and nothing is saved until you import.',
  },
  {
    question: 'How accurate is trade extraction from a screenshot?',
    answer:
      'It depends on the image. Clear, uncropped rows with their column headers read well; small or blurred text can lose a digit. That is why every extracted row is shown beside its screenshot for you to check, and why a broker file is the better route whenever your broker offers one.',
  },
  {
    question: 'Which AI reads my screenshots, and what is sent?',
    answer:
      'Screenshot import sends the images you upload to Google Gemini, through OpenRouter, for that request. Reports and chat never send your screenshots. Details are in the privacy policy.',
  },
  {
    question: 'How many screenshots can I import a month?',
    answer: `AI extraction is limited to ${extraction?.pro ?? '200 per month'} on Pro and on the ${TRIAL_DAYS}-day free trial. Broker file imports are counted separately.`,
  },
  {
    question: 'Can I attach chart screenshots to a trade?',
    answer:
      'Yes, that is a separate feature. Each trade can carry notes, tags and screenshots, for example the chart at entry, so the picture is beside the numbers when you review.',
  },
];

export default function ScreenshotImportPage() {
  const page = getSeoPage('/import-trades-from-screenshot');
  return (
    <ContentPageShell title={page.title} description={page.description} path={page.path} jsonLd={seoPageSchema(page, [], FAQ)}>
      <h1 className="mb-4 text-[32px] font-semibold leading-tight text-foreground sm:text-[40px]">
        Import trades from a screenshot
      </h1>
      <ShortAnswer>
        When a broker or prop-firm dashboard has no export, take a screenshot of the trade list and upload it to TradeQut.
        AI extraction reads the trades, you check each row against the image, and the trades land in your journal without
        retyping. Up to 15 screenshots at a time, {extraction?.pro ?? '200 per month'}.
      </ShortAnswer>

      <H2>When a screenshot is the only export</H2>
      <UL>
        <li>A prop-firm dashboard that shows closed trades but has no download button.</li>
        <li>A broker mobile app where the trade history can be viewed but not exported.</li>
        <li>A statement someone sent you as an image.</li>
      </UL>
      <P>
        If your broker does give a file, use it: a file carries every execution with its exact time. TradeQut reads
        Zerodha, Dhan, Upstox, Angel One and Groww reports and MetaTrader 4 and 5 history, and any other CSV or Excel file
        where you match the columns. See <A to="/blog/importing-trades-from-broker">importing trades from your broker</A>.
      </P>

      <H2>How it works</H2>
      <OL>
        <li>Open <em>Import</em> and choose the account the trades belong to.</li>
        <li>Upload or paste the screenshots: PNG, JPG or WebP, up to 1 MB each and up to 15 at a time.</li>
        <li>AI extraction reads the trades and fills a review table. Each row shows the screenshot it came from.</li>
        <li>Compare prices, dates and quantities with the image, fix any row in place, and remove rows you do not want.</li>
        <li>Import. Only the rows you kept are saved, and the page shows how many.</li>
      </OL>

      <H2>Get a clean read</H2>
      <UL>
        <li>Capture whole rows with their column headers; do not crop too tightly.</li>
        <li>Use several clear screenshots rather than one zoomed-out image.</li>
        <li>Check prices and dates against the image: extraction can misread a digit.</li>
      </UL>

      <H2>Screenshot or file: which to use</H2>
      <Table
        caption="Two ways to get trades into TradeQut without typing"
        head={['Aspect', 'Broker file', 'Screenshot']}
        rows={[
          ['Use it when', 'Your broker or platform has an export', 'There is no export'],
          ['Accuracy', 'Exact: the broker’s own numbers', 'Check each row against the image'],
          ['Duplicates', 'Trades already imported are marked and skipped', 'Review before saving'],
          ['Limit', PLAN_LIMITS.find((r) => r.feature === 'Broker file imports')?.pro ?? '', extraction?.pro ?? ''],
        ]}
      />

      <H2>Where the image goes</H2>
      <P>
        Screenshot import sends the images you upload to Google Gemini, through OpenRouter, to read the trades. AI reports
        and chat never send your screenshots. The <A to="/privacy">privacy policy</A> lists every processor.
      </P>
      <Callout title="Chart screenshots on a trade are separate">
        Importing trades from a screenshot is about getting the numbers in. You can also attach screenshots, such as the
        chart at entry, to any trade, alongside notes and tags.
      </Callout>

      <H2>What it costs</H2>
      <P>
        Screenshot import is part of the {TRIAL_DAYS}-day free trial, which has every Pro feature and needs no card. After
        that Pro is {usdMonth} a month ({inrMonth} in India); without Pro the journal is read-only. See{' '}
        <A to="/pricing">pricing</A>, the <A to="/guide#import">import section of the guide</A>, or the pages for{' '}
        <A to="/blog/prop-trading-challenges">prop-firm challenges</A> and{' '}
        <A to="/mt5-trading-journal">MetaTrader 5</A> imports.
      </P>

      <Faq items={FAQ} />
      <Disclaimer>
        TradeQut is a journaling and analytics tool, not investment advice. AI extraction can misread an image; the review
        step is there so that you confirm every trade before it is saved.
      </Disclaimer>
      <SignupCta />
    </ContentPageShell>
  );
}
