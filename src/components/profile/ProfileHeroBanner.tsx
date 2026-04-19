import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Edit2, Loader2 } from "lucide-react";

interface ProfileHeroBannerProps {
  name: string;
  email: string;
  memberSince: string;
  subscriptionStatus?: string;
  isEditing: boolean;
  onEditClick: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/20 text-green-300 border-green-500/30",
  trial: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  paused: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  cancellation_requested: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  past_due: "bg-red-500/20 text-red-300 border-red-500/30",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProfileHeroBanner({
  name,
  email,
  memberSince,
  subscriptionStatus,
  isEditing,
  onEditClick,
}: ProfileHeroBannerProps) {
  const displayName = name || "User";
  const status = subscriptionStatus || "free_with_ads";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl p-6 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, hsl(160, 84%, 25%) 0%, hsl(160, 84%, 18%) 50%, hsl(160, 70%, 15%) 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 sm:h-20 sm:w-20">
            <AvatarImage src="" alt={displayName} />
            <AvatarFallback className="bg-gradient-primary text-lg font-bold text-primary-foreground sm:text-xl">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white sm:text-xl">
              {displayName}
            </h2>
            <p className="truncate text-sm text-white/60">{email}</p>
            {memberSince && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                <Calendar className="h-3 w-3" />
                <span>Member since {memberSince}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:shrink-0">
          <Badge
            className={cn(
              "border capitalize",
              STATUS_STYLES[status] ?? "bg-muted/20 text-white/60 border-white/10"
            )}
          >
            {formatStatus(status)}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={onEditClick}
            disabled={isEditing}
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {isEditing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Editing...
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4" />
                Edit Profile
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
