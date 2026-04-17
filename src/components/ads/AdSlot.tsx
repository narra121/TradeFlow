import { useEffect, useRef } from 'react';
import { useShowAds } from '@/hooks/useShowAds';
import { cn } from '@/lib/utils';

interface AdSlotProps {
  placementId: string;
  className?: string;
}

let adsenseLoaded = false;
function loadAdsenseScript(clientId: string) {
  if (adsenseLoaded) return;
  const script = document.createElement('script');
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  script.async = true;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  adsenseLoaded = true;
}

export function AdSlot({ placementId, className }: AdSlotProps) {
  const { showAds, adConfig, getPlacement } = useShowAds();
  const adPushed = useRef(false);

  const placement = getPlacement(placementId);

  useEffect(() => {
    if (placement && adConfig?.clientId && !adPushed.current) {
      loadAdsenseScript(adConfig.clientId);
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        adPushed.current = true;
      } catch {
        // Ad blocker or script not loaded — gracefully ignore
      }
    }
  }, [placement, adConfig?.clientId]);

  if (!showAds || !placement || !placement.enabled) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full flex flex-col items-center py-2',
        'border border-border/10 rounded-lg bg-card/30',
        'overflow-hidden',
        className
      )}
      data-testid={`ad-slot-${placementId}`}
    >
      <span className="text-[10px] text-muted-foreground/40 mb-1">Ad</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adConfig?.clientId}
        data-ad-slot={placement.slotId}
        data-ad-format={placement.format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
