import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

interface ArticleCardProps {
  title: string;
  description: string;
  href: string;
  tags: string[];
  readingTime?: number;
  meta?: string;
}

export function ArticleCard({ title, description, href, tags, readingTime, meta }: ArticleCardProps) {
  return (
    <Link to={href} className="group bg-card rounded-lg border border-border/50 p-6 sm:p-8 hover:border-primary/30 transition-colors">
      <p className="mb-2 text-xs capitalize text-muted-foreground">{tags.join(' · ')}</p>
      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-2">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {readingTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readingTime} min read
            </span>
          )}
          {meta && <span>{meta}</span>}
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}
