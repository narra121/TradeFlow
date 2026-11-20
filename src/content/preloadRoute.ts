import { lazyContent } from './lazyContent';
import { BlogArticlePage, CaseStudyPage, PAGE_AT } from './publicPages';

/** Loaders for the page and, for articles and scenarios, their content chunk. Empty for any other path. The registries load lazily so they stay out of the entry chunk. */
export function routeLoaders(pathname: string): (() => Promise<unknown>)[] {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const blog = /^\/blog\/([^/]+)$/.exec(path);
  if (blog) {
    return [
      async () => {
        const { BLOG_ARTICLES } = await import('./blog/articles');
        const article = BLOG_ARTICLES.find((a) => a.slug === blog[1]);
        // Same key and loader as BlogArticlePage, so the body it renders is the one loaded here.
        await Promise.all([BlogArticlePage.preload(), article && lazyContent(`blog/${article.slug}`, article.content).preload()]);
      },
    ];
  }
  const study = /^\/case-studies\/([^/]+)$/.exec(path);
  if (study) {
    return [
      async () => {
        const { CASE_STUDIES } = await import('./case-studies/studies');
        const found = CASE_STUDIES.find((c) => c.slug === study[1]);
        // Same key and loader as CaseStudyPage.
        await Promise.all([CaseStudyPage.preload(), found && lazyContent(`case-study/${found.slug}`, found.content).preload()]);
      },
    ];
  }
  const page = PAGE_AT[path];
  return page ? [page.preload] : [];
}

/**
 * Loads the chunk(s) of the page being opened, so the first render shows the real page instead of committing a
 * spinner over the prerendered one. Always resolves, but only once the loads settle: until then the prerendered page
 * stays on screen, and rendering earlier would only swap it for a spinner waiting on the same chunk.
 */
export function preloadRoute(pathname: string): Promise<void> {
  return Promise.all(routeLoaders(pathname).map((load) => load())).then(
    () => undefined,
    () => undefined,
  );
}
