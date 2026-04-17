import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, AlertTriangle, AlertCircle, Info, Zap, ExternalLink } from 'lucide-react';
import type { Insight } from '@/types/insights';

interface InsightCardProps {
  insight: Insight;
}

const severityConfig = {
  critical: {
    border: 'border-l-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: AlertTriangle,
    label: 'Critical',
    glowHsl: 'hsl(0 72% 51% / 0.2)',
  },
  warning: {
    border: 'border-l-yellow-400',
    badge: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    icon: AlertCircle,
    label: 'Warning',
    glowHsl: 'hsl(45 93% 47% / 0.2)',
  },
  info: {
    border: 'border-l-blue-400',
    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    icon: Info,
    label: 'Info',
    glowHsl: 'hsl(200 95% 50% / 0.2)',
  },
  strength: {
    border: 'border-l-success',
    badge: 'bg-success/10 text-success border-success/20',
    icon: Zap,
    label: 'Strength',
    glowHsl: 'hsl(160 84% 39% / 0.2)',
  },
} as const;

export function InsightCard({ insight }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { severity, title, detail, evidence, tradeIds } = insight;
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'ai-glow-card border-l-4 cursor-pointer',
        config.border
      )}
      style={{
        boxShadow: expanded
          ? `inset 4px 0 12px -4px ${config.glowHsl}`
          : undefined,
      }}
      onClick={() => setExpanded(!expanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
    >
      {/* Header — always visible */}
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <Icon className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                config.badge,
                (severity === 'critical' || severity === 'warning') && 'animate-pulse'
              )}
            >
              {config.label}
            </Badge>
            <h4 className="text-sm font-medium text-foreground truncate">{title}</h4>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground transition-transform duration-200" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 space-y-3 animate-blur-reveal">
          {/* Detail */}
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            {detail}
          </p>

          {/* Evidence */}
          {evidence && (
            <div className="pl-7">
              <div className="rounded-lg bg-secondary/30 border border-border/30 px-3 py-2">
                <p className="text-xs text-muted-foreground italic leading-relaxed">
                  &ldquo;{evidence}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Trade links */}
          {tradeIds && tradeIds.length > 0 && (
            <div className="pl-7">
              <button
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigation would be handled by parent or router
                }}
              >
                <ExternalLink className="w-3 h-3" />
                View {tradeIds.length} related trade{tradeIds.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
