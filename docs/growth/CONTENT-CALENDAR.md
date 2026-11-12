# TradeQut content calendar: 24 months (2026-12 to 2028-11)

Goal: organic traffic, then sign-ups, then Pro revenue, run by one person. Cadence: about one piece a week in Months 1-6,
then two to three a month. Every piece follows `ARTICLE-TEMPLATE.md` and the rules below.

## Rules for every piece

- Facts about charges, brokers, competitor prices and rules are read from the primary source on the day of writing, linked
  in a `Sources` block with the date checked. If a source cannot be read, say so in the text; never fill in a number.
- Product claims come only from `src/content/product-facts.ts`.
- No performance claims, no "users made X", no named customers, no advice to buy or sell. Prop-firm content never recommends
  a firm; Indian forex content carries the RBI/FEMA note from the SEO runbook.
- Each article opens with a 2-3 sentence short answer (`summary`) and ends with 3-6 FAQ items (`faq`); both are stored in
  the article registry so the visible text and the JSON-LD stay identical.
- Keywords are working targets; confirm in Search Console (queries, impressions) before and after publishing. No search
  volumes are claimed here.

## Clusters

| Code | Cluster | Intent |
|---|---|---|
| A | India brokers and file import (Zerodha, Dhan, Upstox, Angel One, Groww) | informational, then product |
| B | Charges and tax (STT, GST, stamp duty, F&O income) | informational |
| C | Options and F&O journaling | informational, then product |
| D | Forex, MetaTrader and prop-firm journaling (non-India framing) | informational, then product |
| E | Best / free / alternatives comparisons | commercial investigation |
| F | Journaling method and review habits | informational |
| G | Metrics and risk maths | informational |
| H | Psychology and discipline | informational |
| I | Templates and tools | transactional (free) |

Priority: P1 = write first (high intent or product fit), P2 = normal, P3 = fill-in.

## Months 1-6: about weekly

| Month | Date | Title | Primary keyword | Cluster | Intent | Target URL | Priority | Internal links |
|---|---|---|---|---|---|---|---|---|
| Month 1 | 2026-12 | Dhan trade history: download and journal it | dhan trade history download | A | informational | /blog/dhan-trade-history-journal | P1 | /trading-journal-india, /blog/zerodha-tradebook-pnl |
| Month 1 | 2026-12 | Upstox trade report: download and journal it | upstox trade report download | A | informational | /blog/upstox-trade-report-journal | P1 | /trading-journal-india |
| Month 1 | 2026-12 | Angel One trade history: download and journal it | angel one trade history | A | informational | /blog/angel-one-trade-history-journal | P2 | /trading-journal-india |
| Month 1 | 2026-12 | Year-end review of your trading journal | trading year end review | F | informational | /blog/year-end-trading-review | P2 | /blog/how-to-review-trades |
| Month 2 | 2027-01 | Trading journal goals and rules for the new year | trading goals for the year | H | informational | /blog/trading-goals-and-rules | P2 | /blog/build-trading-plan |
| Month 2 | 2027-01 | Groww trade history: download and journal it | groww trade history download | A | informational | /blog/groww-trade-history-journal | P2 | /trading-journal-india |
| Month 2 | 2027-01 | Nifty options trade journal: a worked month | nifty options journal | C | informational | /blog/nifty-options-journal-example | P1 | /blog/options-trading-journal-india |
| Month 2 | 2027-01 | Expiry-day trading: what to measure | expiry day trading analysis | C | informational | /blog/expiry-day-trading-analysis | P2 | /blog/options-trading-journal-india |
| Month 3 | 2027-02 | F&O income and ITR: what a journal should hold | f&o income itr records | B | informational | /blog/fo-income-itr-records | P1 | /blog/fo-trading-charges-india |
| Month 3 | 2027-02 | Turnover for F&O traders: how it is calculated | f&o turnover calculation | B | informational | /blog/fo-turnover-calculation | P1 | /blog/fo-trading-charges-india |
| Month 3 | 2027-02 | Contract notes vs tradebook vs P&L report | contract note vs tradebook | B | informational | /blog/contract-note-vs-tradebook | P2 | /blog/zerodha-tradebook-pnl |
| Month 3 | 2027-02 | Journal vs spreadsheet: when to switch | trading journal vs spreadsheet | E | commercial | /blog/trading-journal-vs-spreadsheet | P2 | /blog/trading-journal-excel-template |
| Month 4 | 2027-03 | Best trading journal for Indian traders | best trading journal india | E | commercial | /blog/best-trading-journal-india | P1 | /alternatives, /pricing |
| Month 4 | 2027-03 | Edgewonk alternative | edgewonk alternative | E | commercial | /alternatives/edgewonk | P2 | /alternatives |
| Month 4 | 2027-03 | Tradervue alternative | tradervue alternative | E | commercial | /alternatives/tradervue | P2 | /alternatives |
| Month 4 | 2027-03 | Financial-year-end checklist for traders (India) | trader financial year end checklist | B | informational | /blog/trader-fy-end-checklist | P2 | /blog/fo-income-itr-records |
| Month 5 | 2027-04 | STT, GST and charges: what changed this financial year | stt changes f&o | B | informational | /blog/stt-changes-this-year | P1 | /blog/fo-trading-charges-india |
| Month 5 | 2027-04 | Intraday vs delivery charges compared | intraday vs delivery charges | B | informational | /blog/intraday-vs-delivery-charges | P2 | /blog/fo-trading-charges-india |
| Month 5 | 2027-04 | Banknifty options journal fields | banknifty options journal | C | informational | /blog/banknifty-options-journal | P2 | /blog/options-trading-journal-india |
| Month 5 | 2027-04 | Option selling journal: margin, risk and rules | option selling journal | C | informational | /blog/option-selling-journal | P2 | /blog/options-trading-journal-india |
| Month 6 | 2027-05 | MT4 history export and journal | mt4 trading journal | D | informational | /blog/mt4-trading-journal | P2 | /blog/mt5-trading-journal |
| Month 6 | 2027-05 | Prop-firm evaluation journal: tracking loss limits | prop firm trading journal | D | informational | /blog/prop-firm-evaluation-journal | P1 | /blog/prop-trading-challenges |
| Month 6 | 2027-05 | Forex session analysis with a journal | forex session analysis | D | informational | /blog/forex-session-analysis | P2 | /case-studies/forex-session-edge |
| Month 6 | 2027-05 | Swap, commission and spread in forex P&L | forex swap commission pnl | D | informational | /blog/forex-swap-commission-pnl | P3 | /blog/mt5-trading-journal |

## Months 7-12: two to three a month

| Month | Date | Title | Primary keyword | Cluster | Intent | Target URL | Priority | Internal links |
|---|---|---|---|---|---|---|---|---|
| Month 7 | 2027-06 | Maximum adverse excursion explained | maximum adverse excursion | G | informational | /blog/maximum-adverse-excursion | P3 | /blog/r-multiple-explained |
| Month 7 | 2027-06 | Sharpe and Sortino ratio for traders | sharpe ratio trading | G | informational | /blog/sharpe-sortino-for-traders | P3 | /glossary |
| Month 8 | 2027-07 | Journaling after a losing streak | losing streak trading | H | informational | /blog/journaling-after-a-losing-streak | P2 | /blog/trading-psychology-managing-emotions |
| Month 8 | 2027-07 | Overtrading: how to measure it | overtrading trading | H | informational | /blog/overtrading-how-to-measure | P2 | /blog/day-trading-journal |
| Month 8 | 2027-07 | Half-year review of your trading | trading half year review | F | informational | /blog/half-year-trading-review | P3 | /blog/how-to-review-trades |
| Month 9 | 2027-08 | Trading plan template (free) | trading plan template | I | transactional | /blog/trading-plan-template | P1 | /blog/build-trading-plan |
| Month 9 | 2027-08 | Pre-trade checklist template | trading checklist template | I | transactional | /blog/pre-trade-checklist | P2 | /blog/why-trading-rules-matter |
| Month 10 | 2027-09 | Win rate by setup: a spreadsheet method | win rate by setup | G | informational | /blog/win-rate-by-setup | P2 | /blog/trading-expectancy-formula |
| Month 10 | 2027-09 | Risk of ruin explained | risk of ruin trading | G | informational | /blog/risk-of-ruin | P3 | /blog/position-sizing-fixed-risk |
| Month 10 | 2027-09 | Kelly criterion and why many traders use a fraction | kelly criterion trading | G | informational | /blog/kelly-criterion-trading | P3 | /blog/position-sizing-fixed-risk |
| Month 11 | 2027-10 | Equity curve: what it can and cannot tell you | equity curve trading | G | informational | /blog/equity-curve-trading | P3 | /blog/trading-drawdown-calculation |
| Month 11 | 2027-10 | Crypto trading journal: exchange exports | crypto trading journal | D | informational | /blog/crypto-trading-journal | P2 | /blog/best-free-trading-journal |
| Month 12 | 2027-11 | Annual update: F&O charges and STT (re-check every rate) | f&o charges 2027 | B | informational | /blog/fo-trading-charges-india (update) | P1 | /pricing |
| Month 12 | 2027-11 | Annual update: free journal comparison (re-check every limit) | best free trading journal | E | commercial | /blog/best-free-trading-journal (update) | P1 | /alternatives |
| Month 12 | 2027-11 | Annual update: competitor pages (re-read vendor pricing) | tradezella alternative | E | commercial | /alternatives/* (update) | P1 | /pricing |

## Months 13-24: two to three a month

| Month | Date | Title | Primary keyword | Cluster | Intent | Target URL | Priority | Internal links |
|---|---|---|---|---|---|---|---|---|
| Month 13 | 2027-12 | Year-end review, second edition: what to compare | trading year in review | F | informational | /blog/year-end-trading-review (update) | P2 | /blog/half-year-trading-review |
| Month 13 | 2027-12 | Journal metrics dashboard: which five to watch | trading journal metrics | G | informational | /blog/five-journal-metrics | P2 | /blog/trading-metrics-that-matter |
| Month 14 | 2028-01 | Commodity (MCX) trade journal fields | mcx trading journal | C | informational | /blog/mcx-trading-journal | P3 | /trading-journal-india |
| Month 14 | 2028-01 | Currency (NSE) derivatives journal | currency derivatives journal | C | informational | /blog/currency-derivatives-journal | P3 | /blog/forex-trading-journal |
| Month 15 | 2028-02 | Trader tax records checklist (India) | trader tax records checklist | B | informational | /blog/trader-tax-records-checklist | P1 | /blog/fo-income-itr-records |
| Month 15 | 2028-02 | Advance tax for traders: what to record | advance tax traders | B | informational | /blog/advance-tax-traders | P2 | /blog/fo-turnover-calculation |
| Month 16 | 2028-03 | Importing multi-broker trades without double counting | multiple broker journal | A | informational | /blog/multi-broker-journal | P2 | /trading-journal-india |
| Month 16 | 2028-03 | Re-importing files safely: duplicate handling | duplicate trades import | A | informational | /blog/reimport-trades-duplicates | P3 | /blog/zerodha-tradebook-pnl |
| Month 17 | 2028-04 | STT and charges: annual rate check | stt rates | B | informational | /blog/stt-changes-this-year (update) | P1 | /blog/fo-trading-charges-india |
| Month 17 | 2028-04 | New financial year: journal setup | trading journal setup | F | informational | /blog/new-financial-year-journal-setup | P3 | /blog/getting-started-tradequt |
| Month 18 | 2028-05 | Prop-firm drawdown rules: how to read them | prop firm drawdown rules | D | informational | /blog/prop-firm-drawdown-rules | P2 | /blog/trading-drawdown-calculation |
| Month 18 | 2028-05 | Journaling for funded accounts: multi-account method | funded account journal | D | informational | /blog/funded-account-journal | P2 | /case-studies/multi-account-management |
| Month 19 | 2028-06 | Swing trading journal: holding-period analysis | swing trading journal | F | informational | /blog/swing-trading-journal | P2 | /blog/day-trading-journal |
| Month 19 | 2028-06 | Scalping journal: costs per trade | scalping journal | F | informational | /blog/scalping-journal | P3 | /blog/fo-trading-charges-india |
| Month 20 | 2028-07 | Half-year review, second edition | trading half year review | F | informational | /blog/half-year-trading-review (update) | P3 | /blog/year-end-trading-review |
| Month 20 | 2028-07 | Tagging mistakes: a short taxonomy | trading mistakes list | H | informational | /blog/trading-mistakes-taxonomy | P2 | /blog/mistakes-new-traders-make |
| Month 21 | 2028-08 | Reviewing a losing week: a 30-minute routine | review losing week trading | F | informational | /blog/review-a-losing-week | P2 | /blog/how-to-review-trades |
| Month 21 | 2028-08 | Break-even win rate by risk-reward | breakeven win rate | G | informational | /blog/breakeven-win-rate | P2 | /resources/risk-reward |
| Month 22 | 2028-09 | Trading journal for beginners: the first 50 trades | beginner trading journal | F | informational | /blog/first-50-trades-journal | P2 | /blog/how-to-keep-trading-journal |
| Month 22 | 2028-09 | Position sizing for options sellers | options position sizing | C | informational | /blog/options-position-sizing | P3 | /blog/position-sizing-fixed-risk |
| Month 23 | 2028-10 | Journal export and backup: keep your data portable | export trading journal data | F | informational | /blog/export-trading-journal-data | P3 | /about |
| Month 23 | 2028-10 | Comparison refresh: all competitor pages | trading journal comparison | E | commercial | /alternatives/* (update) | P1 | /pricing |
| Month 24 | 2028-11 | Annual update: F&O charges, STT, stamp duty | f&o charges 2028 | B | informational | /blog/fo-trading-charges-india (update) | P1 | /pricing |
| Month 24 | 2028-11 | Two-year retrospective: which pieces earned traffic | (internal review) | F | n/a | docs/growth only | P1 | MONTHLY-CHECKLIST.md |

## How to use this file

1. At the start of each month, pick that month's rows, then re-rank them against Search Console: queries that already show
   impressions come first.
2. Write each piece from `ARTICLE-TEMPLATE.md`; add it to `src/content/blog/articles.ts`; run `bun run build`.
3. When a piece ships, change its row title or add `(published YYYY-MM-DD)`; when a row is dropped, say why.
4. Every page marked `(update)` is a refresh of an existing page: re-read each linked source and change `updatedAt`.
