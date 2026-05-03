import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CalculatorCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export function CalculatorCard({ title, description, href, icon: Icon }: CalculatorCardProps) {
  return (
    <Link to={href} className="group bg-card rounded-2xl border border-border/50 p-6 sm:p-8 hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-4">{description}</p>
      <span className="text-sm text-primary flex items-center gap-1">
        Open calculator <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}
