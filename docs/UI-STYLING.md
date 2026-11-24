# UI elements and styling

How the TradeQut frontend looks and how to change it. For folder structure, routing, state and API data see [ARCHITECTURE.md](ARCHITECTURE.md). Every statement here was checked against the working tree of branch `feat/ux-redesign`.

Short version: dark theme only, colours come from CSS variables, components use Tailwind classes built from those variables, and shared primitives in `src/components/ui` carry the sizes, focus and touch rules. New screens reuse these; they do not invent styles.

## 1. Styling stack

| Piece | File | What it does |
| --- | --- | --- |
| Tailwind 3.4 | `tailwind.config.ts` | Maps token names (`bg-card`, `text-profit`) to CSS variables; adds font sizes, z-index steps, radius scale. Plugin: `tailwindcss-animate` (the `animate-in` / `fade-in-0` / `slide-in-*` classes used by dialogs). |
| PostCSS | `postcss.config.js` | `tailwindcss` and `autoprefixer` only. |
| Global CSS | `src/index.css` | Token values, base rules, a few component classes, motion keyframes. The only stylesheet the whole app shares. |
| shadcn/ui | `components.json` | Style `default`, CSS variables on, base colour `slate`, aliases `@/components/ui`, `@/lib/utils`. Used only when a primitive is added with the shadcn CLI. Every primitive in `src/components/ui` has since been edited by hand, so never re-run the CLI over an existing file. |
| Class helper | `src/lib/utils.ts` | `cn(...)` = `clsx` + `tailwind-merge` (see below). |
| Variants | `class-variance-authority` | `cva` in `button.tsx`, `badge.tsx`, `sheet.tsx`, `toast.tsx`. |
| Typography plugin | `@tailwindcss/typography` is in `package.json` but is not listed in `plugins` of `tailwind.config.ts`. Long text uses the app's own classes (section 4). |

Other stylesheets are page-scoped and imported by the component that needs them: `src/components/auth/auth.css` (auth pages), `src/components/landing/landing.css` (landing page, classes prefixed `lp-`), and the `.css` files next to the showcase components (section 6). They read the same tokens.

Tailwind scans `./src/**/*.{ts,tsx}` (and the legacy `pages/components/app` globs, which do not exist at the repo root). A class built by string concatenation (`"bg-" + name`) is never generated. Write full class names.

### cn() and tailwind-merge

`cn()` runs `twMerge` so that a later class replaces an earlier class of the same group (`cn("px-3", className)` lets the caller override padding). The merge instance is extended in `src/lib/utils.ts`:

```ts
extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: ["13", "2xs"] }] } } })
```

Why: the custom sizes `text-13` and `text-2xs` (from `fontSize` in `tailwind.config.ts`) are unknown to tailwind-merge. Unregistered, it reads them as a text colour and drops the real colour. Checked by running both configurations:

| Input | Plain tailwind-merge | Extended (what the app uses) |
| --- | --- | --- |
| `text-primary-foreground text-13` | `text-13` (colour lost) | both kept |
| `text-13 text-foreground` | `text-foreground` (size lost) | both kept |
| `text-xs text-13` | both kept (wrong) | `text-13` |

Rules:

- If you add a custom value to `fontSize` in the Tailwind config, add its key to the `font-size` list in `src/lib/utils.ts` in the same change.
- tailwind-merge does not know the custom `z-*` steps (`z-bar`, `z-tooltip`) or `shadow-overlay` against built-ins either. They are kept next to `z-50` or `shadow-lg` instead of replacing them (checked), so do not rely on `cn()` to override a z-index or shadow set by a primitive; remove the old class.
- Pass `className` last in `cn()` so callers can override.
- Conflicting classes in one literal string that does not go through `cn()` are not merged. Use `cn()` for any class list built from props or conditions.

## 2. Design tokens

Token values live in `src/index.css` under `:root` as bare HSL triples (`--primary: 160 84% 39%`), so opacity modifiers work: `bg-primary/15` compiles to `hsl(var(--primary) / 0.15)`. Tailwind names are mapped in `theme.extend.colors` of `tailwind.config.ts`. Read the comments in `:root`; they state the contrast rules for each token. Do not copy values into other docs.

In Tailwind, `foo` and `foo-foreground` come as pairs (fill and the text on that fill) for `primary secondary destructive success warning info muted accent popover card`.

| Group | Tokens | Use |
| --- | --- | --- |
| Surfaces | `background`, `card`, `popover`, `muted`, `secondary` | Layers from page up: background < card < muted < secondary (hover and pressed). `popover` is for menus, dialogs, tooltips. |
| Text | `foreground`, `foreground-soft`, `foreground-faint`, `muted-foreground` | Primary, secondary, tertiary text. `muted-foreground` is the quiet label colour. |
| Brand and action | `primary`, `ring` | Green accent: primary buttons, selection, links, focus ring. |
| Pro / AI | `accent`, `accent-text` | Violet, reserved for Pro and AI surfaces (comment in `index.css`). `accent-text` is the text-safe shade. |
| Result colours | `profit`, `loss`, `tint-profit-1..3`, `tint-loss-1..3` | Trading results only (P&L, R, calendar heat). Tints are 10, 20 and 32 percent washes. These switch with the colour-blind palette (section 3). |
| Status | `error`, `destructive`, `success`, `warning`, `info` | Form errors and failures use `error` (text and borders) and `destructive` (fills). They do not change with the P&L palette; `Field` is tested for this. |
| Lines | `border`, `border-strong`, `input` | Hairlines, stronger outlines, form-control borders. |
| Overlay | `scrim`, `--shadow-overlay` | Dialog backdrop (`bg-scrim`) and the one popup shadow (class `shadow-overlay`). |
| Table state | `--row-hover`, `--row-selected`, `--row-selected-solid`, `--row-flash-solid` | Used by the `.dt-row` rules in `index.css`; not Tailwind colours. |
| Charts | `chart-1..5`, `--chart-grid`, `--chart-axis` | Series colours, grid and axis text. Only `chart-1..5` have Tailwind names; grid and axis are read as `hsl(var(--chart-grid))`. |
| Sidebar | `sidebar` (= `--sidebar-background`), `sidebar-foreground`, `sidebar-primary`, `sidebar-accent`, `sidebar-border`, `sidebar-ring` | The side navigation and the mobile tab bar (`bg-sidebar-background`). |
| Motion | `--dur-1..3` (100, 160, 220 ms), `--ease-in`, `--ease-out` | Used in CSS files and the popup keyframes. |

Other scales, all in `tailwind.config.ts`:

| Scale | Values |
| --- | --- |
| Radius | `rounded-lg` = `--radius` (0.375rem), `rounded-md` = radius minus 2px, `rounded-sm` = radius minus 4px. Panels use `rounded-lg`, controls `rounded-md`. |
| Font size | Tailwind defaults plus `text-2xs` (11px / 16px) and `text-13` (13px / 20px). |
| z-index | `z-sticky` 10, `z-bar` 20, `z-scrim` 30, `z-popover` 40, `z-dialog` 50, `z-toast` 60, `z-tooltip` 70. Dialogs, sheets and popups literally use `z-50` (same number as `dialog`); the comment in `src/components/ui/popup.ts` explains why popups use 50 and not 40. |
| Shadow | One custom shadow, `shadow-overlay` (defined in the `utilities` layer of `index.css`). |
| Container | `container` is centred, 2rem padding, 2xl = 1400px. The app frame does not use it; it uses `max-w-[1440px]` on `main`. |

Spacing is Tailwind's default scale; there is no custom spacing token.

## 3. Themes, palette, motion

**One theme.** The app is dark only.

- `index.html` has `<html lang="en" class="dark">`; the static pages `public/error.html` and `public/maintenance.html` set `color-scheme: dark`.
- `darkMode: ["class"]` is set in the Tailwind config, but components do not use `dark:` variants. Only one match exists in `src` (`prose-invert` in `src/pages/resources/PipCalculatorPage.tsx`).
- There is no ThemeProvider, no light token set and no theme switch. `src/components/ui/sonner.tsx` hard-codes `theme="dark"`. In `index.css`, `select { color-scheme: dark }` makes native option lists dark; it is scoped to `select` on purpose (comment there).
- The showcase kit has its own `data-theme` (`light | dark | blueprint | glass` in `src/components/showcase/kit/looks.ts`) for faux product windows only. It is not an app theme.

**Adding a light theme** would need a second set of variables under a selector (for example `html:not(.dark)`) in `src/index.css`, an owner for the class on `<html>`, and a check of every hard-coded `theme="dark"`/`color-scheme: dark`. See recipe (h).

**P&L palette switch.** `html[data-pnl='cb']` in `src/index.css` overrides only `--profit`, `--loss`, `--tint-profit-*`, `--tint-loss-*` and `--row-flash-solid` with a blue and orange pair. Flow:

1. The choice is `pnlPalette: 'default' | 'cb'` in `UiState` (`src/hooks/useUiState.ts`), stored in `localStorage` key `tq.ui`.
2. `AppPage` (`src/pages/AppPage.tsx`) writes it to `document.documentElement.dataset.pnl` in an effect. It is therefore active inside `/app` only; public pages are always the default palette.
3. It is changed from Settings (`src/components/settings/PreferencesSection.tsx`, also synced to the account through `usePreferences.ts`) and from the command palette (`CommandPalette.tsx`, ids `pnl-cb`, `pnl-default`).

Consequence: any result colour must come from `profit` / `loss` / `tint-*` tokens, never from `primary`, `destructive` or a literal colour. Direction (long/short) and outcome chips are deliberately neutral (`src/components/ui/chips.tsx`).

**Density.** `density: 'comfortable' | 'compact'` is in the same `UiState` and also written to `dataset.density` by `AppPage`, but no CSS reads that attribute. Density takes effect only through the `density` prop of `DataTable` (rows 36 px or 28 px).

**Elevation.** There are no glow utilities (no `glow` class exists in `src`). Surfaces are flat: a 1px border on a solid fill (comment above `.panel` in `index.css`). The only shadow is `shadow-overlay` on popups, menus, dialogs, sheets, tooltips and toasts. The legacy `shadow-lg` survives in `src/components/ui/toast.tsx` (Radix toast, see section 5) and a few other places.

**Motion.**
- `.animate-fade-in` (150 ms), `.animate-caret` and the popup motion `.popup-motion` (opacity plus 4px travel, direction from `data-side`) are in `index.css`. `popup-motion` is part of `popupSurface` in `src/components/ui/popup.ts`.
- Dialogs and sheets animate with `tailwindcss-animate` classes inside the primitives.
- Reduced motion: a global `@media (prefers-reduced-motion: reduce)` block at the end of `index.css` shrinks every animation and transition to 0.01 ms. The landing page also stops its own animation and offers Pause (`src/components/landing/motion.tsx`, `LandingMotionProvider`); the showcase kit reads the preference in `kit/reduced-motion.ts`.

## 4. Typography, numbers and formatting

**Fonts.** DM Sans (UI text) and JetBrains Mono (figures), self-hosted as woff2 in `public/fonts/`, declared in `public/fonts/fonts.css`, which `index.html` links as a stylesheet. Each family has a `latin` and a `latin-ext` file split by `unicode-range`; `latin-ext` loads only when a glyph such as the rupee sign is shown. `index.html` preloads the two `latin` files. DM Sans latin uses `font-display: block`, the others `swap`; the header comment in `fonts.css` gives the reason. Tailwind families: `font-sans` (DM Sans) and `font-mono` (JetBrains Mono, falling back to DM Sans for glyphs it lacks). `body` turns on `font-feature-settings: 'ss01', 'cv11'`.

To add a font file: put the woff2 in `public/fonts/`, add an `@font-face` in `fonts.css`, add the family to `fontFamily` in `tailwind.config.ts`, and preload it in `index.html` only if it is on the first paint.

**Type scale in use** (from the primitives; follow them):

| Use | Class |
| --- | --- |
| Page title (top bar) | `text-base font-semibold` |
| Panel and dialog titles | `text-sm font-semibold` |
| Body, buttons, table cells | `text-13` (Button default, table, popup rows) or `text-sm` |
| Labels, hints, errors, chips | `text-xs` |
| Section captions in menus and sidebar | `text-2xs font-semibold uppercase tracking-[0.04em]` (`popupLabel`) |
| Stat figures | `font-mono text-xl font-medium tabular-nums` (`StatCell`) |
| Inputs | `text-base md:text-sm` (16px on phones so iOS does not zoom) |

Public page headings use `text-[32px] sm:text-[40px]` (section 6).

**Numbers.** Figures use `font-mono tabular-nums` (50 files use `tabular-nums`). `.num` in `index.css` is the same pair as one class; both forms exist. Money and R are rendered by `Money` / `RMultiple` (`src/components/ui/money.tsx`), which add the sign, the result colour (`text-profit`, `text-loss`, `text-foreground-soft` for zero) and `whitespace-nowrap`. Pass `neutral` for a balance or any figure that is not a result.

**Formatting helpers.** Never format with `toFixed` or `toLocaleString` inside a component; use `src/lib/format.ts`:

| Helper | Output rule |
| --- | --- |
| `formatMoney(value, currency, {sign, decimals})` | Sign first, true minus sign (U+2212), currency symbol from `currencySymbol`, 2 decimals. Grouping follows the currency: INR uses `en-IN` (lakh grouping), everything else `en-US`. Missing value gives an em dash. |
| `formatCompactMoney` | Axis ticks and calendar cells: `k`, `M`; INR uses `L` and `Cr`. `symbol: false` drops the symbol. |
| `formatPrice`, `formatQuantity` | Prices up to 5 decimals, quantities up to 4, `en-US` grouping. |
| `formatPercent(value, decimals, {sign})`, `formatR`, `formatProfitFactor` | `formatR` gives `+1.50R` / `0.00R`; profit factor shows an infinity sign when there are wins and no losses. |
| `formatDurationMinutes` | `<1m`, `45m`, `2h 10m`, `3d 4h`. |
| `formatCount` | Counts, `en-US` grouping. |
| `formatDateShort` (`04 Nov`), `formatDayText` (`4 Nov`), `formatTime` (24-hour), `formatDateTime` (`23 Oct 17:06`) | Table cells use the two-digit form; headings and sentences use `formatDayText`. An ISO timestamp is read on the app time zone's clock (Settings, via `src/lib/appTimeZone.ts`); a date-only string is read as written. |
| `parseLocalDate` | Parses `YYYY-MM-DD` as a local date. |
| `signOf` | `positive | negative | zero` on the value rounded to 2 decimals; drives the colour. |

`src/lib/dateUtils.ts` holds one function, `formatLocalDateOnly` (a `Date` to `YYYY-MM-DD` without UTC conversion), for API date strings.

**Legacy and helper classes in `index.css`.** `.panel` (also used by 39 files; the `Panel` component is the preferred way), `.num`, `.mono`, `.row-selected`, `.dt-row`, `.shadow-overlay`, `.pb-safe` (safe-area bottom padding), `.touch-target`. `.glass-card`, `.stat-card`, `.profit-text`, `.loss-text`, `.label-quiet`, `.prose-tq` and `.no-scrollbar` are defined but no `.tsx` or `index.html` file in the working tree uses them (searched). Do not use them in new code.

## 5. Component inventory

### 5.1 Primitives: `src/components/ui/`

Import from `@/components/ui/<file>`. Tests live in `src/components/ui/__tests__`.

| File | Exports | Rule |
| --- | --- | --- |
| `button.tsx` | `Button`, `buttonVariants` | Every clickable action. Variants: `default` (primary fill), `destructive`, `outline`, `secondary`, `ghost`, `link`, `accent` (Pro/AI). Sizes: `default` h-8, `sm` h-7, `lg` h-9, `xl` h-10, `icon` 32px, `icon-sm` 28px; all grow to 44px on touch. `asChild` renders a link with button styles; `buttonVariants()` gives the classes for non-button elements. Icon-only buttons need an `aria-label`. |
| `badge.tsx` | `Badge` | Status tag. Variants: `default` (green text on tinted fill), `secondary`, `destructive`, `warning`, `info`, `pro`, `outline`. No sizes. `default` and `destructive` use `text-profit` / `text-loss`, so they follow the P&L palette. |
| `chips.tsx` | `DirectionChip`, `OutcomeChip`, `OUTCOME_LABEL` | Trade direction and outcome as neutral text; no result colour. |
| `money.tsx` | `Money`, `RMultiple` | Any P&L or R figure (section 4). |
| `input.tsx`, `textarea.tsx`, `label.tsx` | `Input`, `Textarea`, `Label` | Raw controls. Input is h-9 (44px min on touch), blurs on wheel when `type="number"`, and shows `border-error` when `aria-invalid="true"`. In forms wrap them in `Field`. |
| `field.tsx` | `Field`, `FieldA11y` | Label + control + hint/error. Children is a render prop that receives `id`, `aria-describedby`, `aria-invalid`, `aria-required`; spread it on the control. Error replaces hint. |
| `select.tsx` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, ... | Radix select for short fixed lists. 11 files also use a native `<select>`; the primitive is preferred for new work. |
| `picker.tsx` | `Picker` | Searchable listbox, single or tri-state multi, optional "Create". Used for strategy, mistakes, tags in the pane, table cells, bulk bar and filters. |
| `segmented-control.tsx` | `SegmentedControl` | 2 to 5 mutually exclusive options (radiogroup, arrow keys). `size`: `sm` or `md`. Needs a `label` prop. |
| `switch.tsx`, `checkbox.tsx` | `Switch`, `Checkbox` | Small visual, 44px hit area on touch through a pseudo-element. |
| `datetime-field.tsx`, `calendar.tsx` | `DateTimeField`, `Calendar` | Typed 24-hour date and time with a calendar popover (the native date input is not used). `Calendar` is react-day-picker, week starts Monday. |
| `dialog.tsx` | `Dialog*`, `useReturnFocus` | Modal for forms and content. Content is max-w-lg, `bg-popover`, scrolls past 90vh, has a built-in Close button. |
| `alert-dialog.tsx` | `AlertDialog*` | Confirm a destructive or irreversible step. Action is a primary Button, Cancel an outline Button. |
| `sheet.tsx` | `Sheet*` | Edge panel; `side`: `top | bottom | left | right` (default right). The mobile "More" menu uses `bottom`. |
| `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx` | `Popover*`, `DropdownMenu*`, `Tooltip*` | Anchored surfaces. Popover for small forms and lists; DropdownMenu for actions; Tooltip (opens after 400 ms) for names of icon buttons, never for essential text. |
| `popup.ts` | `popupSurface`, `popupItem`, `popupHighlight`, `popupOption`, `popupLabel`, `popupSeparator`, `POPUP_COLLISION_PADDING` | Class strings shared by every popup so menus, selects, popovers and hand-built lists look the same. Use these for a hand-built list inside a popover. |
| `command.tsx` | `Command*`, `CommandDialog` | cmdk wrapper. Only the command palette uses `CommandDialog`. |
| `data-table.tsx` | `DataTable`, `DataColumn`, `revealFromPinned` | The one table (5.3). |
| `panel.tsx` | `Panel` | Bordered card section with optional `title`, `description`, `actions`; `padded={false}` for tables and lists. |
| `empty-state.tsx`, `error-state.tsx`, `skeleton.tsx` | `EmptyState`, `ErrorState`, `Skeleton` | Section 5.6. |
| `kbd.tsx` | `Kbd` | A key cap in hints. |
| `refresh-button.tsx`, `text-enhancer-button.tsx` | `RefreshButton`, `TextEnhancerButton` | Feature buttons, not generic primitives: refresh with spinner; AI "improve text" button that calls the text API and toasts failures. |
| `sonner.tsx`, `toast.tsx`, `toaster.tsx` | `Toaster`, `toast`; Radix toast parts | Section 5.5. |

### 5.2 App shell (signed-in frame)

Assembled in `src/pages/AppPage.tsx` (`AppFrame`, wrapped by `ChromeProvider`). One viewport tall (`h-dvh overflow-clip`): the document never scrolls; the content list inside `PaneHost` is the only scroller. Order top to bottom, inside the content column:

| Piece | File | Notes |
| --- | --- | --- |
| Skip link | `AppPage.tsx` | First focusable element, targets `#main`. |
| Sidebar | `src/components/layout/Sidebar.tsx` | Fixed left, shown from md up. 232px wide, 56px (`w-14`) collapsed. Items from `src/components/shell/navItems.ts` (`NAV_GROUPS`, `titleForPath`, `isScopedPath`, `TAB_ITEMS`). Collapsed automatically below 1280px regardless of the saved preference. |
| Incident bar | `shell/IncidentBar.tsx` | Banner for a current incident; dismissible per incident. |
| Top bar | `shell/TopBar.tsx` | 48px, sticky. Holds the `<h1 id="page-title">`, count, level-2 tabs, Jump to, New trade, Import, Help and user menu. Focus moves to the title on every route change. |
| Scope bar | `shell/ScopeBar.tsx` | 44px, sticky under the top bar, `role="toolbar"` named "Data shown". Account switcher and period on scoped pages (`isScopedPath`), a one-line statement on the others; page actions on the right; the selection bar replaces it when rows are selected; shows "Updated" time and failure state. |
| Notice slot | `shell/NoticeSlot.tsx` | One banner by priority (offline, payment failed, read-only, trial ending, trades without account, getting started). Text from `src/copy`. |
| Pane host | `src/components/trade/PaneHost.tsx` | Wraps `<main id="main">`; holds the docked or expanded trade pane and the scroll list (`data-trade-list`). |
| Mobile tab bar | `shell/MobileTabBar.tsx` | Fixed bottom bar under 768px: Home, Trades, Add, Calendar, More (a bottom sheet). Hidden while a trade pane is open. |
| Command palette, shortcuts sheet | `shell/CommandPalette.tsx`, `shell/ShortcutsDialog.tsx` | Ctrl/Cmd+K and `?`. |
| Content scroll | `shell/useContentScroll.ts` | Restores scroll on Back/Forward, scrolls to top on new links, page keys scroll the list. Called once in `AppFrame`. |
| Prefetch | `shell/prefetchPage.ts` | Loads a page's code and data on hover/focus/touch start. |

**How a page talks to the shell** (`src/components/shell/chrome.tsx`):

- `usePageChrome({ count, tabs, statement, ownPeriod, selecting })` declares the top-bar count, level-2 tabs, the scope-bar statement and flags. It clears on unmount. `tabs` with `to` are links; with `onSelect` they switch in place. 11 files call it.
- `<ScopeBarSlot side="left" | "right" | "selection">` portals content into the scope bar. Set `ownPeriod: true` and render your own period control when the page needs its own (Calendar, Goals).
- Outside the app frame (public pages, unit tests) these calls do nothing.

Titles are not set per page: add the route to `navItems.ts` and `titleForPath` supplies both the `<h1>` and the document title.

### 5.3 Tables and lists

- `DataTable` (`src/components/ui/data-table.tsx`) renders markup only: sticky 32px header, rows 36px (comfortable) or 28px (compact), 44px on touch, one tab stop with a roving row cursor, `aria-sort`, optional selection column, groups with sticky headers, pinned columns (`pinned: 'left' | 'right'`, `pinWidth`), header menus, column resize, and `virtualize` (mounts only rows near the viewport; the nearest scrolling ancestor is the scroller). Sorting, filtering and selection belong to the screen. Row colours come from `.dt-row` CSS variables in `index.css`, so every cell, pinned or not, paints one flat colour.
- Column fields: `id`, `header`, `cell`, `align: 'right'` (numbers), `sortable`, `width`, `hideBelow: 'sm'|'md'|'lg'|'xl'`, `pinned`, `srHeader` (icon-only header gets an accessible name), `resizable`.
- Seven files use `DataTable`. The trade log wraps it in `src/components/tradelog/TradeTable.tsx`; its columns are defined once in `src/lib/tradeColumns.ts` (`TRADE_COLUMNS`: id, label, group, sort key, pixel width, align, pinned, presets, compact) and rendered by the `switch (id)` in `TradeTable.tsx`. Other trade-log pieces: `FilterBar.tsx`, `MultiSelectFilter.tsx`, `ColumnsMenu.tsx` (presets, toggles, density), `BulkBar.tsx`, `CellPicker.tsx` (inline Picker in a cell).
- Windowed lists outside the table: `src/hooks/useWindowedList.ts`. Sticky rows (a just-edited row stays in place until refresh): `src/lib/stickyRows.ts`. Both are used only by `TradeLogView.tsx`.

### 5.4 Forms, dialogs, menus

- **Forms**: `Field` around `Input`, `Textarea`, `Select`, `SegmentedControl`, `DateTimeField`. The reference form is `src/components/trade/TradeForm.tsx` (state shape in `tradeFormState.ts`). Validation errors are strings per field passed to `Field error`; server errors go through `readApiError` (`src/lib/apiError.ts`). Trade-specific inputs: `SmartInput.tsx`, `DynamicSelect.tsx`, `ExpiryField.tsx`, `MistakeTagsInput.tsx`, `BrokenRulesSelect.tsx`, `ImageUploader.tsx`.
- **Drafts**: `useFormDraft(key)` (`src/hooks/useFormDraft.ts`) saves form state to `sessionStorage` 500 ms after the last change and returns `{ draft, hasDraft, save, clear }`. Only `TradeForm` uses it (keys `tq.draft.new` and `tq.draft.<id>`).
- **Offline**: `useOnline()` (`src/hooks/useOnline.ts`); forms disable save and show the strings in `copy.offline`.
- **Dialog or sheet or pane?** Dialog: a short task that blocks the page (feedback, support, shortcuts). AlertDialog: confirm destructive steps only. Sheet: mobile menus and edge panels. Trade create/edit is not a dialog: it is the trade pane (`TradePane.tsx`, hosted by `PaneHost.tsx`), docked beside the list on wide screens and full-width on phones.
- Dialogs opened from state, not from a `DialogTrigger`, still return focus to the opener; `useReturnFocus` in `dialog.tsx` does this for Dialog, Sheet and AlertDialog. Always render a `DialogTitle` (use `sr-only` if hidden); `CommandDialog` does.
- Examples: `src/components/help/FeedbackDialog.tsx`, `ContactSupportDialog.tsx`.
- **Menus**: `HelpMenu.tsx`, `UserMenu.tsx`, `AccountSwitcher.tsx` in `shell/`. **Command palette**: `shell/CommandPalette.tsx` (commands list built in the component; recent commands stored by `src/lib/paletteRecent.ts`).

### 5.5 Toasts

Two systems are mounted in `src/App.tsx`: `<Toaster />` from `ui/toaster.tsx` (Radix toast, fed by `src/hooks/use-toast.ts`) and `<Sonner duration={5000} closeButton />` from `ui/sonner.tsx`. Every toast producer in `src` imports `toast` from `sonner`; the only file that imports `use-toast` is `toaster.tsx`. Use `import { toast } from 'sonner'`. API failures toast automatically through `src/store/middleware/toastMiddleware.ts`; do not add a second toast for the same error.

Sonner is configured to show one toast at a time, bottom-left on desktop (offset past the sidebar by a rule at the end of `index.css`) and top-centre on phones. Undo-able actions use a 10 s toast (`src/hooks/useUndoableDelete.ts`).

### 5.6 Empty, loading, error, offline states

| State | Use | Notes |
| --- | --- | --- |
| No data | `EmptyState title description action` | Dashed border, left-aligned. Copy says what is missing and the next step. Used in the trade log, goals, calendar, analytics, accounts, tax report. |
| Failed load | `ErrorState title error onRetry` | `role="alert"`; pass the RTK error as `error` and it shows the API's message via `readApiError`. 20 files use it. |
| Loading | `Skeleton` shaped like the final content (32 files) | A skeleton with `aria-label` becomes `role="status"`. Keep the reserved height so the page does not jump (see `StatCell` and `Delta`). |
| Route loading | `RouteFallback` in `AppPage.tsx`; `PageLoadingFallback` in `src/appRoot/shared.tsx` | Spinners for lazy routes only. |
| Offline | `useOnline()` plus `copy.offline` | The notice slot shows the banner; inputs show `saveHint`. |
| Page crash | `RouteErrorBoundary` in `AppPage.tsx`, `ChunkErrorBoundary` in `src/appRoot/shared.tsx` | Texts in `copy.frame`. Chunk errors after a deploy reload once. |

### 5.7 Charts

Recharts 2 is used in three files: `src/components/dashboard/EquityChart.tsx`, `src/components/analysis/OverviewPanels.tsx` and `src/components/analysis/RiskTab.tsx`. Conventions seen in all of them:

- Colours are passed as `hsl(var(--token))` strings (Recharts props cannot take Tailwind classes): `--chart-grid` for `CartesianGrid` (horizontal lines only), `--chart-axis` for tick text at font size 11, `--profit` / `--loss` for result bars and areas, `--border-strong` for the zero line, `--chart-4` for single-series lines and bars.
- `isAnimationActive={false}`, axis lines and ticks hidden, `ResponsiveContainer` inside a fixed-height box.
- Money ticks use `formatCompactMoney` with the account currency.
- Every chart is wrapped for accessibility: `ChartFrame` (`src/components/analysis/ChartFrame.tsx`) is a `Panel` with a "View as table" button and a text summary; the equity chart has `role="img"` with an `aria-label` summary, arrow-key navigation and an `aria-live` readout.
- `chart-1..5` are defined as the series palette; the app code currently reads `chart-1..4` sparingly, so pick series colours from this list in order.

Heat and calendar cells use `tint-profit-*` / `tint-loss-*` (`src/components/calendar/MonthGrid.tsx`, `WeekTimeline.tsx`, `YearView.tsx`). Stat figures: `src/components/stats/StatStrip.tsx` (`StatStrip`, `StatCell`), `Delta.tsx` (change line in words for screen readers), `Meter.tsx`, `MetricInfo.tsx` (definition popover, text from `metricDefs.ts`).

### 5.8 Icons, help, onboarding

- Icons: `lucide-react` only (111 files). Default size `h-4 w-4` (`Button` forces `size-4` on child svgs); decorative icons get `aria-hidden="true"`. Table-direction icons use `strokeWidth={1.5}`.
- Help: `src/components/help/` (`FeedbackDialog`, `ContactSupportDialog`, `WhatsNewPopover`), opened from `shell/HelpMenu.tsx`. Metric explanations: `MetricInfo`. Keyboard help: `ShortcutsDialog`.
- Onboarding: `src/components/onboarding/` (`FirstRunPage.tsx`, `ActivationPanel.tsx`, `useGettingStarted.ts`); the "getting started" notice comes from the notice slot.

## 6. Public site styling

| Area | Files | Shared with app? |
| --- | --- | --- |
| Frame | `src/components/public/PublicLayout.tsx` (skip link, `PublicHeader`, `<main id="main-content">`, `PublicFooter`) | Public only. Sets `scroll-padding-top: 4.5rem` so the sticky header does not hide focused elements. |
| Marketing pieces | `src/components/public/` (`PricingTable`, `AnalyticsContents`, `BrandMark`, `nav.ts`) | Public only. |
| Content pages | `src/components/content/` (`ContentPageShell`, `LegalLayout`, `ArticleCard`, `ArticleToc`, `calculator.tsx`, `CalculatorCard`, `NseLotExplorer`, ...) wrap pages in `src/pages` | Public only. They use the same ui primitives and tokens. Headings use `text-[32px] sm:text-[40px]`; reading width `max-w-[72ch]`. |
| Landing | `src/components/landing/` plus `landing.css` (imported by `src/pages/LandingPage.tsx`), classes prefixed `lp-` | Public only; reads the same tokens (header comment in the CSS says nothing under 11px). |
| Auth | `src/components/auth/` plus `auth.css` (imported by `AuthFrame.tsx`) | Own stylesheet using the tokens and the `--dur-*` / `--ease-*` motion variables. |
| Product visuals | `src/components/showcase/` (`DashboardStage`, `CalendarStage`, `TradeReviewDemo`, `AnswerCards`, `RuleCards`, `SegmentStills`, ...), `showcase.css`, `look.css` | Faux product screens built from theme tokens (header of `showcase.css`: so `html[data-pnl]` applies). Sample data in `sampleJournal.ts` / `sampleAnalysis.ts`, labelled with `SampleDataChip`. |
| Vendored kit | `src/components/showcase/kit/` | MIT-licensed Stageshow kit copied in; see `src/components/showcase/kit/VENDORED.md` for what was removed. Import parts from their own files, not a barrel, so a page bundles only the parts and CSS it uses. Edit the kit only to fix it; do not restyle it. |

Public pages run in a separate entry (`src/PublicApp.tsx`) that has no store and no tooltip or toast provider (comment in that file). Do not use `Tooltip`, `toast` or RTK Query in a public page; each adds its library to every public page (size budgets in `scripts/perf/budgets.json`).

## 7. Copy and UI text

- `src/copy/index.ts` exports one object, `copy`, for the sentences of the app frame and the trade log: `offline`, `notices`, `trades`, `frame`. Strings with variables are functions (`copy.notices.trial(daysLeft, endsOn)`), so a sentence is never assembled from fragments. Used by `NoticeSlot`, `TradeLogView`, `TradeTable`, `BulkBar`, `TradePane`, `TradeForm`, `AppPage`.
- Most other text is written inline in the component. Do not move it into `copy` unless it is shared or a notice. Metric definitions live in `src/components/stats/metricDefs.ts`; public-page text in `src/content`; showcase text in `src/components/showcase/copy.ts`.
- Tone rules enforced by `src/copy/__tests__/copy.test.ts`: no exclamation marks, no "please", no "Oops"; no leading or trailing spaces and no trailing ellipsis; singular and plural correct. The comment at the top of `copy/index.ts` adds: plain verbs, concrete numbers, sentence case, no blame.
- Currency, dates and numbers in text come from `format.ts` (section 4).

## 8. Accessibility conventions

| Convention | Where it lives |
| --- | --- |
| One focus style: 2px `--ring` outline with 2px offset on `*:focus-visible` | `src/index.css` base layer. Do not remove it. `outline-none` appears in 32 files, almost all on containers that receive programmatic focus (`main`, the page title) or that draw their own `focus-visible:ring-2`; check that a replacement ring exists whenever you add one. |
| Skip links | `AppPage.tsx` (to `#main`) and `PublicLayout.tsx` (to `#main-content`). |
| Landmarks and F6 | `nav[aria-label="Main"]`, `header`, the scope bar toolbar, `#main`, `aside[aria-label]`; F6 and Shift+F6 cycle them (`src/lib/regions.ts`, `focusNextRegion`). A new region must be added to `REGION_SELECTORS` there. |
| Page title focus | On route change focus moves to `#page-title` (`AppPage.tsx`) so the new page is announced. |
| Keyboard map | `src/lib/keymap.ts` (`KEYMAP`) is the single list; the shortcut sheet, palette hints and `aria-keyshortcuts` read it. Handlers: `src/hooks/useGlobalShortcuts.ts` (single keys are ignored while typing and when the Settings switch is off; `isTypingTarget`). Add a shortcut in `KEYMAP` first, then the handler. |
| Touch targets | 44px under `[@media(pointer:coarse)]` on Button, Input, Select trigger, SegmentedControl, Checkbox, Switch (hit area through a pseudo-element), DataTable rows and headers, popup rows, dialog close buttons, calendar days. Pinned by `src/components/ui/__tests__/touch-targets.test.tsx`. Use the arbitrary variant `[@media(pointer:coarse)]:h-11` exactly as written there. |
| Focus return | Dialog, Sheet and AlertDialog return focus to the opener (`useReturnFocus`; tested in `focus-return.test.tsx`). |
| Form fields | `Field` links label, hint and error; required marker is `aria-hidden`; errors use `text-error`. |
| Live regions and status | `role="alert"` on `ErrorState`; `role="status"` on labelled skeletons and route spinner; `aria-live="polite"` on the equity chart readout. |
| Screen-reader text | `sr-only` in 70 files: icon-only controls ("Close"), table captions, `Delta` spoken text, per-row "Change strategy" labels. |
| Tables | `DataTable` requires a `caption`, sets `aria-sort`, and keeps focused controls from hiding behind pinned columns (`revealFromPinned`). |
| Charts | Summary label plus "View as table" (`ChartFrame`). |
| Colour contrast | Token comments in `index.css` state the targets (text tokens 4.5:1 on every surface; `--accent-foreground` 4.5:1). Fills use `destructive`; text uses `loss` / `error`. Do not put text on a surface not listed as a pair. |
| Motion | Section 3. |
| Automated checks | `e2e/a11y.spec.ts`: axe (WCAG 2.0/2.1/2.2 A and AA tags), fails on serious or critical violations, on every app route at 1280 and 375 px width, plus the trade pane, new-trade form, command palette and help menu. Unit tests in `src/components/ui/__tests__` cover focus return, touch targets, Select inertness and skeleton role. |

## 9. Responsive rules

- Breakpoints are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536); `tailwind.config.ts` does not override `screens`. Usage in app components (excluding pages and showcase): `sm:` 230, `md:` 102, `lg:` 33, `xl:` 12, `2xl:` 11. Design mobile first and add `sm:` / `md:`.
- The phone threshold is 768: `useIsMobile()` (`src/hooks/use-mobile.tsx`) returns true under 768px and reads the width at once, so the first render is already the phone layout. Used by 18 files.
- Shell changes: under 768 the sidebar is gone and `MobileTabBar` is fixed at the bottom (content gets `pb-14`); the top bar shows title, Jump to and the avatar menu, level-2 tabs move to their own 44px row; the selection bar no longer replaces the scope bar; the trade pane is full-width. From 768 to 1279 the sidebar is the 56px icon rail (forced in `AppPage`). From 1280 it follows the saved preference. Content padding is `p-3` on phones and `md:p-6`; content max width 1440px.
- Tables: hide low-priority columns with `hideBelow`; the trade table also has a compact column set when the pane is docked (`compact` flag in `tradeColumns.ts`).
- Touch is detected by pointer type (`pointer: coarse`), not by width. A touch laptop and a narrow desktop window are different cases; handle both.
- Safe areas: use `pb-safe` on bottom-fixed elements.

## 10. House rules (backed by counts)

Counts are from `rg` over `src` excluding test files, on this working tree.

| Rule | Evidence |
| --- | --- |
| No raw hex colours in components. | Only `src/components/auth/GoogleSignInButton.tsx` (brand artwork, 4 matches) contains one. |
| No Tailwind palette colours (`bg-red-500` etc.). | One file: `src/components/ui/toast.tsx` (legacy Radix toast). Use tokens. |
| No `rgb()` or literal `hsl(...)` in TS/TSX outside the showcase. | None found; only `hsl(var(--token))` (for chart props and inline styles). |
| Result colour only from `profit` / `loss` / `tint-*`. | Direction and outcome chips are neutral on purpose; Field test asserts errors keep `text-error`. |
| Surfaces are flat: border plus solid fill; the only shadow token is `shadow-overlay`. | `shadow-overlay` 12 uses; `shadow-lg` 7 left over; one inset `shadow-[...]`. Do not add new shadows. |
| Use the z-index steps. | `z-sticky`, `z-bar`, `z-tooltip` are used by shell and tooltip; `z-50` for dialogs and popups. Literal `z-[60]` (consent banner) and `z-[100]` exist; treat as exceptions, not patterns. |
| Prefer `text-13` to `text-[13px]`. | `text-13`: 57 files. `text-[13px]`: 41 uses in 17 files (analysis, dashboard panels). New code uses `text-13`. |
| Prefer `text-2xs` to `text-[11px]`. | `text-2xs`: 12 files. `text-[11px]`: 9 uses (e.g. mobile tab bar, chart axis). |
| Arbitrary values only for one-off layout widths and the coarse-pointer variant. | Most common arbitrary classes: `text-[32px]`/`text-[40px]` (public headings), `max-w-[72ch]`, `min-h-[44px]`, fixed widths. |
| Inline `style={{}}` is rare. | 17 files (outside the showcase); used for measured values such as the pane width while dragging. |
| One lucide icon library, no emoji or image icons. | 111 files import `lucide-react`. |
| Dates and money through `format.ts`. | Sections 4 and 5. |
| No `dark:` variants. | One match in `src` (a prose class). |

## 11. Making changes

All checks below run from the repo root `TradeFlow/`. Commands that exist as scripts in `package.json`: `bun run lint`, `bun run test` (vitest), `bun run build`, `bun run test:e2e` (Playwright), `bun run dev`. There is no typecheck script; run `bunx tsc -p tsconfig.app.json --noEmit`. Narrow vitest runs: `bunx vitest run src/components/ui` (run from a path spelled `C:/Users/...` with an upper-case drive letter on Windows). Standard gate after any UI change: typecheck, `bun run lint`, the tests for the folder you touched, then `bun run build` when styles or tokens changed. Look at the screen at 1280px and 375px; check the colour-blind palette when result colours are involved.

### (a) Change a brand or semantic colour

1. Edit the HSL triple in `:root` of `src/index.css`. If it is a pair, change the paired foreground too.
2. If the colour is `profit`, `loss` or the tints, also change the `html[data-pnl='cb']` block only if the colour-blind pair should change; keep `--tint-*` in step with `--profit` / `--loss` and update `--row-selected-solid` / `--row-flash-solid` (they are the tint laid over the background, precomputed).
3. If it is `--primary` or `--ring`, also change the `--chart-1`, `--sidebar-primary`, `--sidebar-ring`, `--success`, `--row-selected` copies and the `theme-color` meta in `index.html` (they repeat the hue as separate triples). The brand hex `#10b981` (and the focus colour `#34d399`) is also hard-coded outside the CSS: `public/site.webmanifest` (`theme_color`), `public/error.html`, `public/maintenance.html`, `scripts/og-template.html`, and `GREEN` in `scripts/brand/build-icons.mjs`, which regenerates `public/favicon.svg` and the PNG/ICO icons (`node scripts/brand/build-icons.mjs`).
4. Search for other consumers: `rg "var\(--primary\)|--<token>" src public` and `rg -i "#10b981|#34d399" index.html public scripts` and the CSS files in section 1 and section 6.
5. Check contrast of text on each surface it appears on (token comments state the targets).
6. Run typecheck, lint, `bunx vitest run src/components/ui`, then `bun run build`; run `bun run test:e2e -- e2e/a11y.spec.ts` for contrast regressions.

### (b) Add a new token

1. Add the variable to `:root` in `src/index.css` as a bare HSL triple (add it to `html[data-pnl='cb']` only if it is a result colour).
2. Map it in `theme.extend.colors` of `tailwind.config.ts` as `"hsl(var(--name))"`; add a `-foreground` pair if text goes on it.
3. If the token is a new font size, add it to `fontSize` and to the `font-size` list in `src/lib/utils.ts` (section 1). If it is a new z-index or shadow, add it to the config or the `utilities` layer and remember `cn()` will not merge it with built-ins.
4. Use it in one component, then check `bun run build` output for the generated class.
5. Update the token table in section 2 of this file.

### (c) Add a variant to a ui primitive

1. Open the primitive in `src/components/ui/` and add the variant to its `cva` map (`button.tsx` `variant` or `size`, `badge.tsx` `variant`, `sheet.tsx` `side`).
2. Use tokens only. For a new Button size keep the `[@media(pointer:coarse)]:h-11` class (and `w-11` for icon sizes).
3. Add the size to the list in `src/components/ui/__tests__/touch-targets.test.tsx` (the `sizes` object).
4. Grep for components that restyle the primitive by hand and switch them to the variant: `rg "buttonVariants|<Button" src`.
5. Update the variant list in section 5.1.
6. Checks: typecheck, `bunx vitest run src/components/ui`, lint.

### (d) Build a new screen in the house style

1. Create the view in `src/components/views/<Name>View.tsx` as a named export (follow `GoalsView.tsx` or `AccountsView.tsx`). Data hooks go next to it; structure and data rules are in [ARCHITECTURE.md](ARCHITECTURE.md).
2. Register it in `src/pages/AppPage.tsx`: a `lazyPage(() => import(...))` constant, an entry in the `VIEW_AT` map (so hover and focus preload the page; key is the first path segment after `/app/`) and a `<Route>` inside `Routes`. Add the nav item and title in `src/components/shell/navItems.ts`. Add the path to `isScopedPath` if the page shows account and period data.
3. Declare the chrome: `usePageChrome({ count, tabs, statement, ownPeriod })`. Unscoped pages give a one-line `statement`; pages with their own period set `ownPeriod` and render it in a `ScopeBarSlot`.
4. Lay out with `Panel` sections inside the existing `main`; do not add your own page padding, title or max width. Use `StatStrip` for headline figures and `DataTable` for lists.
5. Handle every state: `Skeleton` while loading, `ErrorState` with `onRetry` on failure, `EmptyState` with a next action when empty, the offline hint on write actions, read-only accounts (`useReadOnlyAccounts`) on edits.
6. Add the route to `e2e/fixtures/routes.ts` so the axe spec covers it. Add a view test beside the others in `src/components/views/__tests__`.
7. Checks: typecheck, lint, view test, `bun run test:e2e -- e2e/a11y.spec.ts`, then look at 1280px and 375px.

### (e) Add a dialog with a form

1. Start from `src/components/help/FeedbackDialog.tsx`. Compose `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`.
2. Each control inside `Field label hint error required`; spread the render-prop attributes on the control.
3. Validate on submit, show strings through `Field error`, show server errors with `readApiError`; disable submit while pending and when offline (`useOnline`, `copy.offline`).
4. Primary action: `Button` default; secondary: `variant="outline"`. A destructive confirm uses `AlertDialog` instead.
5. Success: `toast` from `sonner`. If you want to keep unsaved input across a reload, use `useFormDraft`.
6. Test with Testing Library; assert that the label is tied to the input and that focus returns to the opener (pattern in `src/components/ui/__tests__/focus-return.test.tsx`).
7. Checks: typecheck, lint, the new test, `bunx vitest run src/components/ui`.

### (f) Add a table column (trade log)

1. Add the column to `TRADE_COLUMNS` in `src/lib/tradeColumns.ts`: `id`, `label`, `group`, `sort` (a `SortKey` from `src/lib/tradeFilters.ts`), `width`, `align: 'right'` for numbers, `presets`, `compact`. Add a new `SortKey` and its comparison in `tradeFilters.ts` if the column is sortable.
2. Add a `case '<id>'` to the `switch` in `src/components/tradelog/TradeTable.tsx`. Numbers: `font-mono tabular-nums` and a `format.ts` helper (`formatPrice`, `formatQuantity`, `formatMoney(value, currency)` with the account's currency). Results: `<Money>` or `<RMultiple>`. Dates: `formatDateShort` + `formatTime`. Missing value: an em dash. Text: `truncate text-foreground-soft`.
3. If the column is exported to CSV or saved in column configs, check `src/lib/exportCsv.ts` and the column config persistence in `TradeLogView.tsx` (`saveColumnConfig`).
4. For other tables (not the trade log) define `DataColumn` entries in the view, as in `AccountsView.tsx`: `align: 'right'` for figures, `hideBelow` for optional columns, `srHeader` for icon-only headers.
5. Checks: typecheck, lint, `bunx vitest run src/components/tradelog src/components/ui/__tests__/data-table.test.tsx`, then look at the pinned-column and compact-density cases.

### (g) Add a chart using the chart tokens

1. Wrap it in `ChartFrame` (`src/components/analysis/ChartFrame.tsx`) and supply `title`, a `summary` sentence, and the `table` (formatted strings) alternative.
2. Copy the setup of `src/components/analysis/RiskTab.tsx`: `ResponsiveContainer` in a fixed-height box, `CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false}`, ticks `{ fontSize: 11, fill: 'hsl(var(--chart-axis))' }`, `tickLine={false} axisLine={false}`, `isAnimationActive={false}`.
3. Series colours: `hsl(var(--chart-1))` to `chart-5` in order. Profit and loss values: `hsl(var(--profit))` / `hsl(var(--loss))`. Never a hex value.
4. Tick and tooltip numbers through `formatCompactMoney` / `formatMoney` with the right currency.
5. Provide a loading skeleton, an empty text and an error state around it.
6. Checks: typecheck, lint, test for the host view, a11y e2e spec; view with the colour-blind palette on.

### (h) Add or adjust dark or light theme styles

Dark is the only theme (section 3).

- Adjust dark: change tokens as in recipe (a). Do not add `dark:` classes; every colour already is the dark value.
- Add a light theme (a real project, not a tweak):
  1. In `src/index.css` add a second set of every variable in `:root` under a selector for light mode; keep the P&L `data-pnl` overrides working for both (pick values that pass contrast on both).
  2. Decide the owner of the `<html>` class (today fixed in `index.html`), store the choice in `UiState` (`src/hooks/useUiState.ts`), apply it in `AppPage` next to the `data-pnl` effect, and add a control in `PreferencesSection.tsx`.
  3. Remove the hard-coded dark: `theme="dark"` in `ui/sonner.tsx`, `select { color-scheme: dark }` in `index.css`, the static pages in `public/`, and `theme-color` in `index.html`.
  4. Review CSS that sets its own colours (`auth.css`, `landing.css`, showcase CSS) and the Google sign-in button.
  5. Run the a11y e2e spec in both themes.
