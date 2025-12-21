import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2 } from 'lucide-react';
import { useEnhanceTextMutation } from '@/store/api/textApi';
import { cn } from '@/lib/utils';

interface TextEnhancerButtonProps {
  text: string;
  onEnhanced: (enhancedText: string) => void;
  className?: string;
  size?: 'sm' | 'default';
  disabled?: boolean;
  isTradingNotes?: boolean;
}

export function TextEnhancerButton({ 
  text, 
  onEnhanced, 
  className, 
  size = 'sm',
  disabled = false,
  isTradingNotes = false
}: TextEnhancerButtonProps) {
  const [enhanceText, { isLoading }] = useEnhanceTextMutation();

  const handleEnhance = async () => {
    if (!text.trim()) return;

    try {
      const result = await enhanceText({ text, isTradingNotes }).unwrap();
      onEnhanced(result.enhancedText);
    } catch (error: any) {
      console.error('Failed to enhance text:', error);
      // You could add toast notification here
    }
  };

  const isDisabled = disabled || !text.trim() || isLoading;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size={size === 'sm' ? 'sm' : 'default'}
            onClick={handleEnhance}
            disabled={isDisabled}
            className={cn(
              "text-primary hover:text-primary/80 hover:bg-primary/10",
              size === 'sm' && "h-8 w-8 p-0",
              className
            )}
          >
            {isLoading ? (
              <Loader2 className={cn(
                "animate-spin",
                size === 'sm' ? "w-3 h-3" : "w-4 h-4"
              )} />
            ) : (
              <Sparkles className={cn(
                size === 'sm' ? "w-3 h-3" : "w-4 h-4"
              )} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Enhance with AI</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}