# Vendored: Stageshow kit (MIT, (c) 2026 Benji Taylor — see LICENSE)

Copied from the `stageshow` skill's `kit/` on 2026-11-12 by the landing worker. Local changes:
- removed `brands/` (third-party logo artwork) and `parts/BrandMark.*`, and their exports in `index.ts`,
  `parts/index.ts` and `stageshow.css` — TradeQut shows no other company's marks.
- removed every module (and its stylesheet) that nothing in the app imports: `chart`, `code`, `ios`, `messages`, `window`, most of
  `controls/`, `motion/` and `parts/`, the barrels and `stageshow.css` (FE-073). Re-vendor from the skill when a part is needed.
Import parts from their own files (e.g. `./stageshow/stage`) rather than the barrel, so a page only bundles the
parts — and the CSS — it uses.
Lives in a folder named `kit/`, as in the skill, so the skill's film checks treat these stylesheets as the kit's own.
