import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { User, LogOut, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalInfoCardProps {
  name: string;
  email: string;
  isEditing: boolean;
  editFormData: { name: string; email: string };
  onEditFormChange: (data: { name: string; email: string }) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onLogout: () => Promise<void>;
  isSaving: boolean;
}

export function PersonalInfoCard({
  name,
  email,
  isEditing,
  editFormData,
  onEditFormChange,
  onSave,
  onCancel,
  onLogout,
  isSaving,
}: PersonalInfoCardProps) {
  return (
    <Card
      className={cn(
        "bg-card/50 backdrop-blur border-border/50 rounded-xl",
        isEditing && "border-primary/30"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Personal Information
            </h3>
            {isEditing && (
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                Editing
              </Badge>
            )}
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-[11px] uppercase tracking-wider text-muted-foreground/50">
              Full Name
            </Label>
            {isEditing ? (
              <Input
                id="profile-name"
                value={editFormData.name}
                onChange={(e) =>
                  onEditFormChange({ ...editFormData, name: e.target.value })
                }
                className="border-primary/30 focus-visible:ring-primary/30"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">{name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-[11px] uppercase tracking-wider text-muted-foreground/50">
              Email Address
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  id="profile-email"
                  value={editFormData.email}
                  disabled
                  className="opacity-60"
                />
                <p className="text-[11px] text-muted-foreground/50">
                  (read-only)
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">{email}</p>
            )}
          </div>
        </div>

        <Separator className="my-6 bg-border/50" />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to logout?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the login page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onLogout}>Logout</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
