# Article template

Copy the two blocks below. Replace everything in `<angle brackets>`.

## 1. The article: `src/content/blog/<slug>.tsx`

The short answer and the FAQ are rendered by the article page from the registry entry, so the component holds only the body.

```tsx
import { A, Callout, Disclaimer, H2, P, Sources, Table, UL } from '../components/ArticleParts';

export default function <PascalCaseSlug>() {
  return (
    <>
      <H2><first section heading></H2>
      <P><answer the question in plain words; one idea per paragraph></P>

      <Table
        caption="<what the table shows, and 'Hypothetical example' if invented>"
        head={['<col>', '<col>']}
        rows={[['<cell>', '<cell>']]}
      />

      <Callout title="<one caveat the reader must not miss>"><text></Callout>

      <P>Related: <A to="/blog/<other-slug>"><title></A> and <A to="/pricing">pricing</A>.</P>

      <Sources items={[{ label: '<source name>', url: '<primary URL>', checked: '<YYYY-MM-DD>' }]} />
      <Disclaimer />
    </>
  );
}
```

Parts available from `ArticleParts`: `ShortAnswer`, `H2`, `H3`, `P`, `UL`, `OL`, `A`, `Table`, `Callout`, `Faq`, `Sources`,
`Disclaimer`, `SignupCta`, `ScenarioNote`.

## 2. The registry entry: `src/content/blog/articles.ts`

```ts
{
  slug: '<slug>',
  title: '<60 characters or fewer, primary keyword first>',
  description: '<<= 200 characters; what the reader gets>',
  tags: ['<tag>', '<tag>'],
  publishedAt: '<YYYY-MM-DD>',
  readingTime: <minutes>,
  summary: '<2-3 sentence short answer that stands alone>',
  faq: [
    { question: '<question ending with ?>', answer: '<answer of at least one full sentence>' },
  ],
  howTo: { name: '<only for step-by-step guides>', steps: [{ name: '<step>', text: '<text>' }] },
  content: () => import('./<slug>'),
},
```

## 3. Before you publish

- [ ] Every number has a source and a date; if a source could not be read, the text says so.
- [ ] No promise of results, no advice, no named customers; examples are labelled hypothetical.
- [ ] One `h1` (the page supplies it), headings in order, tables have captions and header cells.
- [ ] Links to 2-3 related articles, a glossary term or calculator where one exists.
- [ ] `bun run test` passes; `bun run build` ends with `verify-dist OK`.
