import { Link } from 'react-router-dom';

export default function ImportingTradesFromBroker() {
  return (
    <>
      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Three Ways to Import Your Trades</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Manually entering every trade into a journal is the biggest reason traders abandon journaling. It takes too
        long, especially for active{' '}
        <Link to="/blog/day-trading-journal" className="text-primary hover:text-primary/80">day traders</Link> who
        might take 5 to 10 trades per session. TradeQut solves this with three import methods that cover virtually
        every broker and platform: CSV file upload, AI-powered screenshot extraction, and clipboard paste. Each
        method is designed to get your trades into the journal with minimal manual effort, so you can spend your
        time on analysis and review rather than data entry.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The right method depends on what your broker provides. Most modern brokers offer CSV or Excel export of trade
        history. Some platforms only show trade data on screen without easy export options. And sometimes you just want
        to quickly capture a few trades from a notification or message. All three methods feed into the same journal
        format, so your analytics and reporting work identically regardless of how the data was imported.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">CSV Import Step-by-Step</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        CSV import is the most reliable method for bulk trade imports. Here is how to use it effectively.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Step 1: Export from your broker.</strong> Log into your trading platform
          and navigate to the trade history or account statement section. Most brokers have an "Export" or "Download"
          button that produces a CSV or Excel file. Look for options that include all trade fields: symbol, entry date,
          exit date, entry price, exit price, quantity, and P&L.
        </li>
        <li>
          <strong className="text-foreground">Step 2: Review the file.</strong> Open the CSV in a spreadsheet program
          and verify the data looks correct. Check that dates are in a recognizable format, prices have the right
          decimal precision, and that the file includes both entries and exits for each trade.
        </li>
        <li>
          <strong className="text-foreground">Step 3: Upload to TradeQut.</strong> In the trade import modal, select
          the CSV tab and drag your file into the upload area or click to browse. The AI engine automatically detects
          column mappings, matching your broker's column headers to TradeQut's trade fields.
        </li>
        <li>
          <strong className="text-foreground">Step 4: Verify and confirm.</strong> Review the extracted trades before
          confirming. Check that symbols, dates, prices, and{' '}
          <Link to="/glossary#pnl" className="text-primary hover:text-primary/80">P&L</Link> values are correct. You
          can edit individual fields before import if anything needs adjustment.
        </li>
      </ul>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">AI Screenshot Extraction</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Not every broker makes it easy to export trade data as structured files. Some platforms only display trade
        history on screen, or you might want to capture trades from a mobile app that does not offer CSV export.
        This is where AI-powered screenshot extraction becomes invaluable.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Take a screenshot of your trade history, account statement, or even a trade confirmation screen. Upload the
        image to TradeQut's import modal under the Screenshot tab. The AI engine, powered by Google's Gemini model,
        analyzes the image and extracts trade data from it. It can read tables, lists, and even partially obscured
        text. The extraction handles various layouts from different brokers including MetaTrader 4 and 5, TradingView,
        Thinkorswim, Interactive Brokers, and most other major platforms.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        For best results when using screenshot extraction, follow these tips. Capture the full trade row including all
        columns. Avoid cropping too tightly, as the AI uses surrounding context to understand column headers. Ensure
        the screenshot is clear and not blurry. If you have many trades, take multiple screenshots rather than one
        zoomed-out image where text is too small to read. You can upload multiple images in a single import session.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Clipboard Paste</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        The clipboard method is the fastest option for small batches of trades. Select your trade data from any
        source, whether a broker's web interface, a spreadsheet, a trading chat room, or even a plain text summary,
        and paste it into the text input area of TradeQut's import modal. The AI engine parses the pasted content and
        extracts structured trade data from it.
      </p>
      <p className="text-muted-foreground leading-relaxed mb-4">
        This method works with surprisingly unstructured data. You can paste formatted tables, tab-separated values,
        comma-separated text, or even natural language descriptions like "Bought 100 shares of AAPL at 185.50 on
        Jan 15, sold at 192.30 on Jan 18." The AI interprets the context and maps the data to the appropriate trade
        fields. While structured data produces more reliable results, the clipboard method's flexibility makes it
        ideal for quick captures during the trading day when you want to log a trade immediately without navigating
        through export menus.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Supported Formats and Platforms</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        TradeQut's import system is designed to be format-agnostic rather than requiring specific templates for each
        broker. The AI engine adapts to whatever format your data arrives in. That said, here are the most commonly
        used formats and the platforms they come from.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li><strong className="text-foreground">CSV/Excel:</strong> MetaTrader 4 and 5 account statements, Interactive Brokers Flex Queries, Thinkorswim account statements, TradingView exports, cTrader history exports.</li>
        <li><strong className="text-foreground">Screenshots:</strong> Any broker platform that displays trade history on screen, including mobile trading apps, web-based platforms, and desktop terminals.</li>
        <li><strong className="text-foreground">Plain text:</strong> Trade summaries from Telegram trading groups, Discord channels, email confirmations, or your own notes.</li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        For{' '}
        <Link to="/blog/forex-trading-journal" className="text-primary hover:text-primary/80">forex traders</Link>{' '}
        using MetaTrader, the MT4/MT5 account statement HTML export is particularly well-supported. Simply save
        the detailed statement as HTML or copy the table content and paste it into the import tool.
      </p>

      <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Troubleshooting Common Issues</h2>
      <p className="text-muted-foreground leading-relaxed mb-4">
        Even with AI-powered extraction, imports occasionally need adjustment. Here are the most common issues and
        how to resolve them.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
        <li>
          <strong className="text-foreground">Dates in wrong format:</strong> Some brokers use DD/MM/YYYY while others
          use MM/DD/YYYY. If the AI misinterprets the date format, review the extracted dates before confirming.
          Trades with dates in the future are a clear signal that the day and month were swapped.
        </li>
        <li>
          <strong className="text-foreground">Missing P&L:</strong> If your broker export does not include P&L as a
          column, TradeQut calculates it automatically from entry price, exit price, and quantity. Ensure these
          three fields are present and correct.
        </li>
        <li>
          <strong className="text-foreground">Duplicate trades:</strong> If you import the same file twice, the system
          detects duplicate trades based on symbol, date, and price combinations. Review the duplicate warning before
          confirming to avoid double-counting trades in your{' '}
          <Link to="/blog/trading-analytics-find-edge" className="text-primary hover:text-primary/80">analytics</Link>.
        </li>
        <li>
          <strong className="text-foreground">Partial extraction from screenshots:</strong> If the AI misses some
          trades from a screenshot, the image quality may be too low or the text too small. Retake the screenshot at
          a higher resolution or crop it into smaller sections with fewer trades per image.
        </li>
        <li>
          <strong className="text-foreground">Currency and lot size:</strong> Ensure your broker's export uses the
          same currency as your TradeQut account settings. If lot sizes appear as "1.00" when you expected "100,000
          units," this is a standard lot notation that the system handles correctly.
        </li>
      </ul>
      <p className="text-muted-foreground leading-relaxed mb-4">
        After importing, always spot-check a few trades against your broker's records. Confirm that the entry and
        exit prices, dates, and P&L values match. Once verified, your imported trades are fully integrated into
        your journal and will appear in all analytics, stats, and goal tracking. The few minutes spent importing
        saves hours of manual entry and ensures your journal stays current, which is the foundation of everything
        from{' '}
        <Link to="/blog/build-trading-plan" className="text-primary hover:text-primary/80">plan tracking</Link> to{' '}
        <Link to="/blog/trading-psychology-managing-emotions" className="text-primary hover:text-primary/80">emotional pattern analysis</Link>.
      </p>
    </>
  );
}
