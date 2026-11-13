import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Month grid for date popovers. Weeks start on Monday, the app default (D.15). Days are 32 px, 44 px on touch: a
 * popover that holds it needs 7 x 44 px plus its padding there.
 */
function Calendar({ className, classNames, showOutsideDays = true, weekStartsOn = 1, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-2",
        caption: "relative flex h-7 items-center justify-center [@media(pointer:coarse)]:h-11",
        caption_label: "text-13 font-medium",
        nav: "flex items-center space-x-1",
        nav_button: buttonVariants({ variant: "ghost", size: "icon-sm" }),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-8 text-xs font-normal text-muted-foreground [@media(pointer:coarse)]:w-11",
        row: "mt-1 flex w-full",
        cell: "relative h-8 w-8 p-0 text-center text-13 focus-within:relative focus-within:z-20 [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-secondary/50 [&:has([aria-selected])]:bg-secondary first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal tabular-nums text-foreground aria-selected:opacity-100 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "font-semibold [&:not([aria-selected])]:text-primary",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-secondary/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-secondary aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
