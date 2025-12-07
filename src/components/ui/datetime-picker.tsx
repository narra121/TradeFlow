import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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
  
  // Get time string from value
  const timeValue = dateValue
    ? `${String(dateValue.getHours()).padStart(2, "0")}:${String(dateValue.getMinutes()).padStart(2, "0")}`
    : "";

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve existing time or use current time
      const hours = dateValue?.getHours() ?? new Date().getHours();
      const minutes = dateValue?.getMinutes() ?? new Date().getMinutes();
      date.setHours(hours, minutes);
      
      // Format as datetime-local string
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      
      onChange(`${year}-${month}-${day}T${hour}:${minute}`);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value;
    if (time && dateValue) {
      const [hours, minutes] = time.split(":").map(Number);
      const newDate = new Date(dateValue);
      newDate.setHours(hours, minutes);
      
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, "0");
      const day = String(newDate.getDate()).padStart(2, "0");
      const hour = String(newDate.getHours()).padStart(2, "0");
      const minute = String(newDate.getMinutes()).padStart(2, "0");
      
      onChange(`${year}-${month}-${day}T${hour}:${minute}`);
    } else if (time && !dateValue) {
      // If no date selected yet, use today
      const today = new Date();
      const [hours, minutes] = time.split(":").map(Number);
      today.setHours(hours, minutes);
      
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const hour = String(today.getHours()).padStart(2, "0");
      const minute = String(today.getMinutes()).padStart(2, "0");
      
      onChange(`${year}-${month}-${day}T${hour}:${minute}`);
    }
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
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="flex-1"
              required={required}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
