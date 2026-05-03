import { Zap } from 'lucide-react';

interface AuthorBoxProps {
  publishedAt: string;
  readingTime?: number;
}

export function AuthorBox({ publishedAt, readingTime }: AuthorBoxProps) {
  const formattedDate = new Date(publishedAt + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
        <Zap className="w-4 h-4 text-primary-foreground" />
      </div>
      <div>
        <span className="text-foreground font-medium">TradeQut Team</span>
        <span className="mx-2">&middot;</span>
        <span>{formattedDate}</span>
        {readingTime && (
          <>
            <span className="mx-2">&middot;</span>
            <span>{readingTime} min read</span>
          </>
        )}
      </div>
    </div>
  );
}
