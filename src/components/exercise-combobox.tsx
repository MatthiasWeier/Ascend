"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/components/locale-provider";

type ComboExercise = { id: string; name: string; warn?: boolean };

export function ExerciseCombobox({
  exercises,
  value,
  onChange,
  className,
}: {
  exercises: ComboExercise[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = exercises.find((e) => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("min-w-[140px] flex-1 justify-between font-normal", className)}
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.name : t("Select")}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("Search exercise…")} />
          <CommandList>
            <CommandEmpty>{t("No exercise found.")}</CommandEmpty>
            <CommandGroup>
              {exercises.map((ex) => (
                <CommandItem
                  key={ex.id}
                  value={ex.name}
                  onSelect={() => {
                    onChange(ex.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("size-4 shrink-0", ex.id === value ? "opacity-100" : "opacity-0")}
                  />
                  {ex.name}
                  {ex.warn && <TriangleAlert className="ml-auto size-3.5 shrink-0 text-amber-500" aria-label="⚠" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
