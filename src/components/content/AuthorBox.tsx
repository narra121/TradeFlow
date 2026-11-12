interface AuthorBoxProps {
  /** Date shown: the last update when there is one, otherwise the publication date (YYYY-MM-DD). */
  publishedAt: string;
  updated?: boolean;
  readingTime?: number;
}

export function AuthorBox({ publishedAt, updated = false, readingTime }: AuthorBoxProps) {
  const formattedDate = new Date(`${publishedAt}T00:00:00`).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">TradeQut</span>
      <span aria-hidden="true" className="mx-2">&middot;</span>
      <time dateTime={publishedAt}>
        {updated ? 'Updated ' : ''}
        {formattedDate}
      </time>
      {readingTime && (
        <>
          <span aria-hidden="true" className="mx-2">&middot;</span>
          <span>{readingTime} min read</span>
        </>
      )}
    </p>
  );
}
