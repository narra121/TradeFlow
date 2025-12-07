import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  required,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Parse the datetime-local string to Date
  const dateValue = value ? new Date(value) : undefined;
  
  // Get hours and minutes
  const hours = dateValue?.getHours() ?? 12;
  const minutes = dateValue?.getMinutes() ?? 0;

  const formatDateTimeString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve existing time or use current time
      const h = dateValue?.getHours() ?? new Date().getHours();
      const m = dateValue?.getMinutes() ?? new Date().getMinutes();
      date.setHours(h, m);
      onChange(formatDateTimeString(date));
    }
  };

  const updateTime = (newHours: number, newMinutes: number) => {
    const date = dateValue ? new Date(dateValue) : new Date();
    date.setHours(newHours, newMinutes);
    onChange(formatDateTimeString(date));
  };

  const incrementHour = () => {
    const newHours = (hours + 1) % 24;
    updateTime(newHours, minutes);
  };

  const decrementHour = () => {
    const newHours = (hours - 1 + 24) % 24;
    updateTime(newHours, minutes);
  };

  const incrementMinute = () => {
    const newMinutes = (minutes + 1) % 60;
    updateTime(hours, newMinutes);
  };

  const decrementMinute = () => {
    const newMinutes = (minutes - 1 + 60) % 60;
    updateTime(hours, newMinutes);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "MMM d, yyyy HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleDateSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-center gap-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            
            {/* Hours */}
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={incrementHour}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-md font-mono text-lg font-semibold">
                {String(hours).padStart(2, "0")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={decrementHour}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-xl font-semibold text-muted-foreground">:</span>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={incrementMinute}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="w-10 h-10 flex items-center justify-center bg-secondary rounded-md font-mono text-lg font-semibold">
                {String(minutes).padStart(2, "0")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={decrementMinute}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
