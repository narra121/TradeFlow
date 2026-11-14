/**
 * Interface copy of the app frame and Trades (D.5): one place for the sentences people read, in one voice. Plain
 * verbs, concrete numbers, sentence case, no exclamation marks, no blame. Strings with variables are functions, so a
 * sentence is never assembled from fragments.
 */
export const copy = {
  offline: {
    notice: "You're offline. Changes can't be saved until you reconnect.",
    saveHint: 'Offline: reconnect to save.',
    bulkHint: 'Offline: editing is paused.',
    pickerTitle: "You're offline",
    pickerBody: 'Reconnect to change journal fields.',
  },

  notices: {
    paymentFailed: 'Your last payment failed. Update your card to keep Pro.',
    updateCard: 'Update card',
    readOnly: 'Your journal is read-only: upgrade to Pro to add, edit or delete.',
    upgrade: 'Upgrade to Pro',
    trial: (daysLeft: number, endsOn: string) => `Free trial: ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left. On ${endsOn} your journal becomes read-only unless you upgrade.`,
    seePlans: 'See plans',
    noAccount: (n: number) => `${n} ${n === 1 ? 'trade has' : 'trades have'} no account and ${n === 1 ? 'is' : 'are'} not counted in statistics.`,
    assignAccounts: 'Assign accounts',
    gettingStarted: (done: number, total: number) => `Getting started ${done} of ${total}`,
    continue: 'Continue',
  },

  trades: {
    loadError: { title: "Couldn't load trades", description: 'Your trades are safe.' },
    emptyScope: { title: 'No trades in this period.', description: 'The account and period selected above have no trades.', action: 'Show all accounts and dates' },
    emptyMatch: { title: 'No trades match these filters.', action: 'Clear filters' },
    ceiling: 'Showing the newest 5,000 trades. Narrow the period to see older ones.',
    outsideScope: 'This trade is outside the current account or period.',
    // What the duplicate copies: tradeFormState.ts (duplicate source).
    duplicate: { label: 'New trade from this one', hint: 'Same account, symbol, size, stop and target' },
  },

  frame: {
    notFound: { title: 'Page not found', body: 'The page may have moved, or the link is wrong.' },
    boundary: {
      title: 'Something went wrong on this page.',
      body: 'The rest of TradeQut still works. If this keeps happening, send us the reference below.',
      reload: 'Reload page',
      report: 'Report this',
    },
  },
} as const;
