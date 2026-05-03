import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface RelatedArticle {
  slug: string;
  title: string;
  description: string;
  readingTime: number;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  basePath?: string;
}

export function RelatedArticles({ articles, basePath = '/blog' }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border/50">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Related Articles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to={`${basePath}/${article.slug}`}
            className="group bg-card rounded-xl border border-border/50 p-5 hover:border-primary/30 transition-colors"
          >
            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{article.description}</p>
            <span className="text-sm text-primary flex items-center gap-1">
              Read more <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
