import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface InsightsSummaryProps {
  summary: string;
}

export function InsightsSummary({ summary }: InsightsSummaryProps) {
  if (!summary) return null;

  return (
    <Card className="ai-glow-card border-0 animate-fade-in">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <div
              className="absolute inset-0 rounded-lg animate-glow-breathe"
              style={{ boxShadow: '0 0 16px hsl(160 84% 39% / 0.4)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold ai-shimmer-text mb-2">
              Overall Assessment
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
