"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type ComboExercise = { id: string; name: string };

// Same picker as ExerciseCombobox, but for "any of these exercises count" -
// a group goal can track e.g. Push-ups + Diamond Push-ups + Pike Push-ups
// together instead of exactly one.
export function ExerciseMultiCombobox({
  exercises,
  value,
  onChange,
  className,
}: {
  exercises: ComboExercise[];
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = exercises.filter((e) => value.includes(e.id));

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between font-normal", className)}
            />
          }
        >
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {selected.length === 0
              ? t("Select")
              : t("{n} exercises selected", { n: selected.length })}
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
                  <CommandItem key={ex.id} value={ex.name} onSelect={() => toggle(ex.id)}>
                    <Check className={cn("size-4 shrink-0", value.includes(ex.id) ? "opacity-100" : "opacity-0")} />
                    {ex.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((ex) => (
            <Badge key={ex.id} variant="secondary" className="gap-1 pr-1">
              {ex.name}
              <button
                type="button"
                onClick={() => toggle(ex.id)}
                aria-label={t("Remove {name}", { name: ex.name })}
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
