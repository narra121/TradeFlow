import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // The app has one theme (dark) and no ThemeProvider, so the toasts say so instead of reading the OS preference.
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      visibleToasts={1}
      position={isMobile ? "top-center" : "bottom-left"}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-overlay",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "!h-6 !w-6 [@media(pointer:coarse)]:!h-11 [@media(pointer:coarse)]:!w-11 !bg-popover !text-foreground !border-border hover:!bg-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
