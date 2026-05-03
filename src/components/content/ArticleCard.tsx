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
    <Link to={href} className="group bg-card rounded-2xl border border-border/50 p-6 sm:p-8 hover:border-primary/30 transition-colors">
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag) => (
          <span key={tag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {tag}
          </span>
        ))}
      </div>
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
