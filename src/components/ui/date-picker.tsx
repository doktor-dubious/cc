"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean | ((date: Date) => boolean);
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );

  // Sync external value
  React.useEffect(() => {
    if (value) {
      const newDate = new Date(value);
      if (!isNaN(newDate.getTime())) {
        setDate(newDate);
      }
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleSelect = (selected: Date | undefined) => {
    setDate(selected);
  };

  const handleConfirm = () => {
    onChange?.(date);
    setOpen(false);
  };

  const handleCancel = () => {
    // Revert to original value (optional — or just close)
    setDate(value ? new Date(value) : undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={typeof disabled === "boolean" ? disabled : false}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-auto p-0"
        align="start"
        // Prevent parent dialog from closing on calendar interaction
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          disabled={typeof disabled === "function" ? disabled : disabled}
        />

        {/* Bottom buttons */}
        <div className="flex justify-end gap-2 p-3 border-t">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={handleConfirm}
            disabled={!date} // optional: disable if no date selected
          >
            Set Date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}