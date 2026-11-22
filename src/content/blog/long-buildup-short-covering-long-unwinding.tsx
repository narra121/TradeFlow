import { A, Callout, Disclaimer, H2, H3, P, Sources, Table, UL } from '../components/ArticleParts';

export default function OpenInterestBuildups() {
  return (
    <>
      <P>
        Compare two readings of the same contract, such as today&apos;s close with yesterday&apos;s. Did the price go up or
        down, and did open interest go up or down? Each of the four answers has a name.
      </P>

      <H2>The four combinations</H2>
      <Table
        caption="Price and open interest over the same period, and the term for each combination"
        head={['Price', 'Open interest', 'Term', 'How it is commonly read']}
        rows={[
          ['Up', 'Up', 'Long build-up', 'New long positions; read as bullish'],
          ['Down', 'Up', 'Short build-up', 'New short positions; read as bearish'],
          ['Down', 'Down', 'Long unwinding', 'Longs closing; read as bearish or a rally losing support'],
          ['Up', 'Down', 'Short covering', 'Shorts closing; read as bullish, but weaker than new buying'],
        ]}
      />
      <P>
        The terms are also written without the hyphen (long buildup, short buildup). They name what happened to positions
        over the period you compared. Zerodha Varsity&apos;s table describes them as positions (&ldquo;more trades on the
        long side&rdquo;, &ldquo;longs are covering their positions&rdquo;) and says that the change in open interest does
        not really convey a directional view on markets. The last column is how the terms are commonly read, not a
        statement about what the price does next.
      </P>
      <Callout title="Where the sources word it differently">
        <UL>
          <li>
            Zerodha Varsity (Futures Trading module, chapter 12) and Dhan&apos;s help page give the same four combinations.
            Varsity calls each a trader&apos;s perception of positions; Dhan adds a sentiment to each: bullish, bearish,
            weakening bullish, and &ldquo;often resulting in a bullish move&rdquo; for short covering.
          </li>
          <li>
            CME Group, a US exchange, does not use these names. Its 2026 article on the COT report says that rising prices
            with rising open interest &ldquo;generally indicate the arrival of new flows in the direction of the move&rdquo;,
            and rising prices with falling open interest suggest a move &ldquo;driven more by short covering than by genuine
            directional conviction&rdquo;. It does not cover the two falling-price rows.
          </li>
          <li>
            Angel One&apos;s Knowledge Center notes that long unwinding is market terminology: SEBI defines long futures
            positions and reports open interest, but the label is the market&apos;s. This page found no exchange or SEBI
            document that defines the four terms.
          </li>
          <li>
            Replying under the Varsity chapter on 6 February 2023, Karthik Rangappa says the table is about futures open
            interest. Dhan and INDmoney apply the same four labels to each option contract, using that option&apos;s own premium as the price
            (see the option chain section below).
          </li>
        </UL>
      </Callout>

      <H2>What open interest counts</H2>
      <P>
        Open interest is the number of contracts that are open: opened, and not yet closed or expired. Varsity defines it as
        the number of futures or options contracts &ldquo;currently outstanding (open) in the market&rdquo;; CME
        Group&apos;s lesson calls it the total number of futures contracts held by market participants at the end of the
        trading day. Every contract has a buyer and a seller and is counted once, so an open interest of 10 means 10 long
        positions and 10 short ones.
      </P>
      <P>
        It is not volume. Volume counts the contracts traded during the period and only rises through a day; open interest
        counts what is still open and can rise or fall. A contract that changes hands adds to volume and can leave open
        interest where it was. One trade moves open interest in one of three ways:
      </P>
      <UL>
        <li>A new buyer trades with a new seller: a long and a short position open, and open interest rises.</li>
        <li>Someone closing trades with someone opening: the position passes from one to the other, and open interest does not change.</li>
        <li>A buyer closing a short trades with a seller closing a long: both positions end, and open interest falls.</li>
      </UL>
      <P>
        That is why a change in open interest always has two sides. If open interest rose by 1,350 contracts, there are
        1,350 more long positions and 1,350 more short positions open than at the start. The numbers do not say which side
        was keen and which side obliged; the four terms infer that from the price. A rising price says buyers were willing
        to pay up, so new open interest on a rising price is called a long build-up, although exactly as many shorts were
        added.
      </P>

      <H2>Long build-up: price up, open interest up</H2>
      <P>
        The price rose and so did open interest: new contracts were opened while buyers pushed the price up. Varsity&apos;s
        wording is &ldquo;more trades on the long side&rdquo;.
      </P>
      <P>
        <strong>Bullish or bearish?</strong> Commonly read as bullish; Dhan&apos;s help page says it suggests bullish
        sentiment. Why that reading can be wrong: every new long has a new short against it, and some of those shorts may be
        hedging something else, such as shares they hold, rather than betting on a fall. The label also covers one period
        only. A build-up today says nothing on its own about tomorrow&apos;s price, which is why Angel One suggests looking at
        the trend across several observations rather than treating one session as conclusive.
      </P>

      <H2>Short build-up: price down, open interest up</H2>
      <P>
        The price fell while open interest rose: new contracts were opened while sellers pushed the price down. Varsity:
        &ldquo;more trades on the short side&rdquo;.
      </P>
      <P>
        <strong>Bullish or bearish?</strong> Commonly read as bearish; Dhan says fresh short positions are being created,
        suggesting bearish sentiment. Why that reading can be wrong: the same number of new long positions was opened, and a
        short future can be a hedge by someone who owns the shares and wants to keep them. In options the word misleads
        most: put writing is a short build-up in the put, yet it is commonly read as bullish for the underlying (see below).
        &lsquo;Short&rsquo; describes the contract, not the market.
      </P>

      <H2>Long unwinding: price down, open interest down</H2>
      <P>
        The price fell and open interest fell: positions were closed, and the sellers were the keener side. Varsity:
        &ldquo;longs are covering their positions&rdquo;. Every closing trade also closes a short, so long unwinding means
        positions on both sides ended while the price slipped.
      </P>
      <P>
        <strong>Bullish or bearish?</strong> Commonly read as bearish, or as a rally losing support: Angel One says it is
        generally viewed as bearish or as weakening bullish sentiment, and Dhan that it may signal weakening bullish
        sentiment. Why that reading can be wrong: closing a long can be profit-taking after a rise, a roll into the next
        month&apos;s contract, or the approach of expiry, none of which is a new view on the market. Angel One adds that long
        unwinding does not guarantee a continued fall.
      </P>

      <H2>Short covering: price up, open interest down</H2>
      <P>
        The price rose while open interest fell: positions were closed, and the buyers were the keener side, which the label
        reads as short sellers buying back. Varsity: &ldquo;shorts are covering their positions&rdquo;.
      </P>
      <P>
        <strong>Bullish or bearish?</strong> Commonly read as bullish, but weaker than a long build-up. Dhan says it often
        results in a bullish move as short sellers exit; CME Group&apos;s article says such a rise is driven &ldquo;more by
        short covering than by genuine directional conviction&rdquo;. Why that reading can be wrong: the buying comes from
        people closing, so it can stop once they have closed, and the same fall in open interest also closed long positions,
        whose owners may simply have taken profit into the rise.
      </P>
      <H3>Long build-up vs short covering</H3>
      <P>
        Both have a rising price. The difference is open interest: up means new positions (long build-up), down means
        positions closing (short covering). The same price rise in the worked example below is a long build-up if open
        interest rose and short covering if it fell, so a price chart alone cannot tell them apart. The falling-price pair
        works the same way: short build-up when open interest rises, long unwinding when it falls.
      </P>

      <H2>In the option chain: call writing, call unwinding, put writing, put unwinding</H2>
      <P>
        An option chain shows, for each strike, the call and the put with their premium and open interest. Apply the
        four-way table to one option contract and use that option&apos;s own premium as the price: Dhan&apos;s help page
        classifies each option contract this way, and INDmoney&apos;s table pairs the change in open interest with the change
        in premium. Writing an option means selling it: Varsity&apos;s options module calls the seller the option writer, and
        Angel One and ICICI Direct describe call writing and put writing as selling a call or a put for its premium.
      </P>
      <Table
        caption="One strike’s premium and open interest, the label for that option and its option-chain name"
        head={['At the strike', 'Label, and its option-chain name', 'Common reading for the underlying']}
        rows={[
          ['Call premium up, call OI up', 'Long build-up: call buying', 'Bullish'],
          ['Call premium down, call OI up', 'Short build-up: call writing', 'Bearish or flat: a ceiling at the strike'],
          ['Call premium up, call OI down', 'Short covering: call unwinding, writers buying back', 'Bullish: the ceiling weakening'],
          ['Call premium down, call OI down', 'Long unwinding: call unwinding, holders selling', 'Bullish bets leaving'],
          ['Put premium up, put OI up', 'Long build-up: put buying', 'Bearish'],
          ['Put premium down, put OI up', 'Short build-up: put writing', 'Bullish or flat: a floor at the strike'],
          ['Put premium up, put OI down', 'Short covering: put unwinding, writers buying back', 'Bearish: the floor weakening'],
          ['Put premium down, put OI down', 'Long unwinding: put unwinding, holders selling', 'Bearish bets or hedges leaving'],
        ]}
      />
      <P>
        The readings in the last column come from the seller&apos;s side. A call writer gains if the underlying stays below
        the strike: Varsity&apos;s call-writing chapter says the seller writes the call because he believes the price will
        not increase in the near future, and Angel One says call writing is typically used when a trader expects the
        underlying to stay in a range, stay flat or fall moderately. ICICI Direct says put writers believe the underlying
        will either stay stable or rise. Angel One&apos;s option-chain page adds that high open interest at a strike may act
        as support or resistance, and Quantsapp&apos;s classroom says it studies option open interest from the writers&apos;
        side.
      </P>

      <H3>Call writing</H3>
      <P>
        Call open interest at a strike rose while the call&apos;s premium fell: a short build-up in that call, read as new
        writers selling it. It is commonly read as a ceiling: the writers expect the underlying to stay below the strike, so
        heavy call writing is read as resistance. Why that reading can be wrong: each new call has a buyer as well as a
        writer; a writer may own the shares (a covered call) or be one leg of a spread rather than a bet on direction; and a
        call&apos;s premium falls with time alone. Varsity&apos;s theta chapter: all options, calls and puts, lose value as
        expiry approaches, when all other conditions remain the same. So open interest up with premium down can be decay
        plus new positions, not eager sellers.
      </P>

      <H3>Call unwinding</H3>
      <P>
        Call open interest at a strike fell: call contracts were closed. Sources use the term two ways. Quantsapp&apos;s
        classroom uses call unwinding for any fall in call open interest, read from the writers&apos; side as writers leaving
        the strike. The four-way table splits the fall by premium. With the premium rising it is short covering in the call,
        writers buying back; INDmoney says traders may read short covering at a strike where writing had built up as sellers
        becoming less comfortable with that level. With the premium falling it is long unwinding in the call, holders selling
        out, which says bullish bets are leaving: the opposite reading. Check the premium before reading anything into the
        term.
      </P>

      <H3>Put writing</H3>
      <P>
        Put open interest at a strike rose while the put&apos;s premium fell: a short build-up in that put, read as new
        writers selling it. It is commonly read as a floor and as bullish or neutral for the underlying, because put writers
        expect it to stay at or above the strike. This is the clearest case where &lsquo;short build-up means bearish&rsquo;
        is wrong: the short position is in the put. Why the reading itself can be wrong: each new put has a buyer, who may be
        protecting shares or a long future; a writer can be one leg of a spread; and the premium also falls with time.
      </P>

      <H3>Put unwinding</H3>
      <P>
        Put open interest at a strike fell. With the premium rising it is short covering in the put: writers buying back,
        commonly read as the floor weakening and bearish for the underlying. With the premium falling it is long unwinding in
        the put: holders selling out, which says bearish bets or hedges are leaving. As with calls, the term alone does not
        say which; the premium does.
      </P>

      <H2>Worked example: a futures contract over two days</H2>
      <P>Hypothetical figures for one stock futures contract, comparing the close on day 2 with the close on day 1.</P>
      <Table
        caption="Hypothetical stock futures contract, one expiry, close to close"
        head={['Reading', 'Close (₹)', 'Open interest (contracts)']}
        rows={[
          ['Day 1', '1,240.00', '18,000'],
          ['Day 2', '1,262.40', '19,350'],
          ['Change', '+22.40 (+1.81%)', '+1,350 (+7.50%)'],
        ]}
      />
      <P>
        Price up, open interest up: a long build-up. The working: 1,262.40 − 1,240.00 = +22.40, and 22.40 ÷ 1,240.00 =
        1.81%; 19,350 − 18,000 = +1,350 contracts, and 1,350 ÷ 18,000 = 7.50%. At the close of day 2 there are 1,350 more
        long positions and 1,350 more short positions open than a day earlier. Had open interest closed at 16,650 instead
        (−1,350, −7.50%), the same +22.40 would be short covering. Compare the same contract and expiry on both days; mixing
        the near and the next month across a rollover produces a change nobody traded.
      </P>

      <H2>Worked example: one call strike over two days</H2>
      <P>
        Hypothetical figures for the 24,500 call of an index, with the index closing at 24,380.00 on day 1 and 24,295.00 on
        day 2.
      </P>
      <Table
        caption="Hypothetical index call option, strike 24,500, close to close"
        head={['Reading', 'Call premium (₹)', 'Call open interest (contracts)']}
        rows={[
          ['Day 1', '142.00', '52,000'],
          ['Day 2', '98.50', '63,700'],
          ['Change', '−43.50 (−30.63%)', '+11,700 (+22.50%)'],
        ]}
      />
      <P>
        Premium down, open interest up: a short build-up in the 24,500 call, which an option-chain reader calls call writing
        at 24,500. The working: 98.50 − 142.00 = −43.50, and 43.50 ÷ 142.00 = 30.63%; 63,700 − 52,000 = +11,700, and
        11,700 ÷ 52,000 = 22.50%. The common reading is that writers see 24,500 as a ceiling. What the numbers do not say:
        the premium fell partly because the index fell 85 points and partly because a day passed, so not all of the −43.50
        came from sellers; and the 11,700 new contracts have 11,700 new buyers as well as new writers.
      </P>

      <H2>What open interest cannot tell you</H2>
      <UL>
        <li>
          <strong>Who opened or closed.</strong> Open interest is a total for the contract. Angel One: price and open
          interest are aggregate market measures, and a fall in open interest alone does not tell you whether every closed
          position was long. INDmoney: aggregate open interest does not identify which side started the trade.
        </li>
        <li>
          <strong>Rollover and expiry.</strong> Before a monthly expiry, traders who want to keep a position close the
          expiring contract and open the next one: near-month open interest falls and next-month open interest rises with
          no change of view. Expired contracts are no longer open at all. Around expiry, add the months together or expect
          the labels to mislead.
        </li>
        <li>
          <strong>One interval.</strong> A 5-minute comparison and a day-on-day comparison of the same contract can carry
          different labels, and one interval proves little. Angel One suggests looking across several observations.
        </li>
        <li>
          <strong>Intraday timing.</strong> Open interest is not updated with every trade. Dhan&apos;s help page says the
          exchange does not provide live open interest, so no broker or platform can show it live, and that the exchange
          updates it at intervals during the day. This page has not found an NSE document that states the interval.
        </li>
        <li>
          <strong>Units and definitions.</strong> Platforms differ: Varsity quotes Nifty futures open interest in
          contracts, while Quantsapp&apos;s example counts shares. Since 1 October 2025 NSE Clearing&apos;s open interest
          files also carry a future-equivalent open interest for each underlying, and the market-wide file&apos;s limit for
          the next day is based on that figure (circular NCL/CMPT/70194, 15 September 2025). It is a different number from
          the contract count on an option chain, so compare like with like.
        </li>
      </UL>

      <H2>Where to read open interest</H2>
      <P>
        From the exchange, or from a broker showing the exchange&apos;s figures. Angel One notes that NSE and BSE publish
        open interest data daily. On NSE&apos;s website (nseindia.com) the option chain has an open interest column for
        each strike, as INDmoney describes. NSE Clearing&apos;s daily files are named in its circular{' '}
        <A to="https://nsearchives.nseindia.com/content/circulars/CMPT70194.pdf">NCL/CMPT/70194</A>: ncloi_DDMMYYYY.csv for
        open interest at NSE Clearing level and combineoi_DDMMYYYY.csv for combined (market-wide) open interest. A
        broker&apos;s option chain can only show what the exchange disseminates, with the timing limit above.
      </P>

      <H2>Record the reading in your journal</H2>
      <P>
        TradeQut does not import or display open interest, and a tradebook lists only your own fills, so a reading you do
        not write down when you enter is gone: intraday open interest cannot be rebuilt from your trade file later. Record
        it with the trade:
      </P>
      <UL>
        <li>The term as a tag, one per trade, for example &ldquo;OI: short covering&rdquo; or &ldquo;OI: call writing 24,500&rdquo;.</li>
        <li>The two readings you compared and the interval: the previous close to now, or the last 15 minutes.</li>
        <li>The contract: the future or the option strike, its expiry, and whether you read the futures or the option chain.</li>
        <li>The price or premium change and the open interest change, with the unit.</li>
      </UL>
      <P>
        Review the tags as groups, not trade by trade: once a tag has enough trades, compare net P&amp;L and average R for
        trades that went with the reading against those that went against it. TradeQut shows which setups, mistakes and
        rules cost money; see the <A to="/fo-trading-journal">F&amp;O trading journal</A> for what it records for Indian
        F&amp;O. The fields an options journal needs are in{' '}
        <A to="/blog/options-trading-journal-india">Options trading journal in India: what to record</A>, and positions held
        overnight are easier to judge with <A to="/blog/mtm-vs-realised-pnl-futures-options">MTM vs realised P&amp;L in
        futures and options</A>. Judge results after charges: see{' '}
        <A to="/blog/fo-trading-charges-india">F&amp;O charges in India, including the new STT charges from 1 April 2026</A>{' '}
        and <A to="/resources/fo-charges-rates">STT rates 2026: F&amp;O, intraday and delivery</A>. Other terms are in the{' '}
        <A to="/glossary">trading glossary</A>.
      </P>

      <Callout title="What this page has not verified">
        <UL>
          <li>
            An exchange or SEBI definition of the four terms: none was found. The definitions here come from broker education
            pages (Zerodha Varsity, Dhan, Angel One, ICICI Direct, INDmoney), Quantsapp and CME Group, read on 22 Nov 2026.
          </li>
          <li>The NISM Series VIII workbook&apos;s section on interpreting open interest, which was not available to read.</li>
          <li>How often NSE updates open interest during the day.</li>
          <li>How each broker&apos;s app labels these combinations, or which interval it compares; check your own platform.</li>
        </UL>
      </Callout>

      <Sources
        items={[
          {
            label: 'Zerodha Varsity, Futures Trading module, chapter 12: Open Interest (the four combinations and the author’s replies)',
            url: 'https://zerodha.com/varsity/chapter/open-interest/',
            checked: '2026-11-22',
          },
          {
            label: 'Dhan Support: What do Long Buildup, Short Buildup, Long Unwinding and Short Covering mean?',
            url: 'https://dhan.co/support/platforms/options-trader/what-do-long-buildup-short-buildup-long-unwinding-and-short-covering-mean/',
            checked: '2026-11-22',
          },
          {
            label: 'Dhan Support: What is buildup in options and futures?',
            url: 'https://dhan.co/support/platforms/options-trader/what-is-buildup-in-options-and-futures/',
            checked: '2026-11-22',
          },
          {
            label: 'Dhan Support: Is Open Interest (OI) data provided in real-time?',
            url: 'https://dhan.co/support/platforms/options-trader/is-open-interest-oi-data-provided-in-real-time/',
            checked: '2026-11-22',
          },
          {
            label: 'CME Group Education, Introduction to Futures: Open Interest',
            url: 'https://www.cmegroup.com/education/courses/introduction-to-futures/open-interest',
            checked: '2026-11-22',
          },
          {
            label: 'CME Group: The CFTC COT report: trade FX futures more effectively (2026)',
            url: 'https://www.cmegroup.com/articles/2026/the-cftc-cot-report-trade-fx-futures-more-effectively.html',
            checked: '2026-11-22',
          },
          {
            label: 'Angel One Knowledge Center: What is long unwinding? (updated 10 Oct 2026)',
            url: 'https://www.angelone.in/knowledge-center/derivatives/long-unwinding',
            checked: '2026-11-22',
          },
          {
            label: 'Angel One Knowledge Center: Call writing',
            url: 'https://www.angelone.in/knowledge-center/futures-and-options/call-writing',
            checked: '2026-11-22',
          },
          {
            label: 'Angel One Knowledge Center: What is option chain?',
            url: 'https://www.angelone.in/knowledge-center/share-market/what-is-option-chain',
            checked: '2026-11-22',
          },
          {
            label: 'Angel One Knowledge Center: What is open interest in options?',
            url: 'https://www.angelone.in/knowledge-center/futures-and-options/open-interest-in-options',
            checked: '2026-11-22',
          },
          {
            label: 'ICICI Direct iLearn: Introduction to put writing',
            url: 'https://www.icicidirect.com/ilearn/futures-and-options/articles/introduction-to-put-writing',
            checked: '2026-11-22',
          },
          {
            label: 'Zerodha Varsity, Options Theory module: Selling/writing a call option',
            url: 'https://zerodha.com/varsity/chapter/sellingwriting-a-call-option/',
            checked: '2026-11-22',
          },
          {
            label: 'Zerodha Varsity, Options Theory module: Theta',
            url: 'https://zerodha.com/varsity/chapter/theta/',
            checked: '2026-11-22',
          },
          {
            label: 'INDmoney: Open interest in options (OI change paired with premium change)',
            url: 'https://www.indmoney.com/learn/fno/open-interest-in-options',
            checked: '2026-11-22',
          },
          {
            label: 'Quantsapp Classroom: Options open interest and bias',
            url: 'https://web.quantsapp.com/quantsapp-classroom/open-interest/options-oi-bias',
            checked: '2026-11-22',
          },
          {
            label: 'NSE Clearing circular 120/2025 (NCL/CMPT/70194): changes in open interest file formats, 15 September 2025',
            url: 'https://nsearchives.nseindia.com/content/circulars/CMPT70194.pdf',
            checked: '2026-11-22',
          },
        ]}
      />
      <Disclaimer />
    </>
  );
}
