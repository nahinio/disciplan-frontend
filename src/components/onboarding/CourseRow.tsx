import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronsUpDown, X, Clock, MapPin, User, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOfferings } from "@/hooks/useOfferings";
import type { CourseOffering } from "@/types/course";

export interface RowState {
  id: string;
  courseCode?: string;
  section?: string;
}

interface Props {
  row: RowState;
  takenCodes: string[];
  canRemove: boolean;
  onChange: (next: RowState) => void;
  onRemove: () => void;
}

function getUniqueCourses(offerings: CourseOffering[]): { code: string; title: string }[] {
  const seen = new Set<string>();
  return offerings
    .filter((o) => {
      if (seen.has(o.course_code)) return false;
      seen.add(o.course_code);
      return true;
    })
    .map((o) => ({ code: o.course_code, title: o.title }));
}

function getSectionsFor(offerings: CourseOffering[], courseCode: string): string[] {
  return offerings.filter((o) => o.course_code === courseCode).map((o) => o.section);
}

function findOffering(offerings: CourseOffering[], courseCode: string, section: string) {
  return offerings.find((o) => o.course_code === courseCode && o.section === section);
}

export function CourseRow({ row, takenCodes, canRemove, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const { offerings } = useOfferings();
  const courses = getUniqueCourses(offerings);

  const offering =
    row.courseCode && row.section
      ? findOffering(offerings, row.courseCode, row.section)
      : undefined;

  if (offering) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="group relative rounded-xl border border-black/10 bg-white shadow-sm p-5 hover:shadow-md transition-shadow"
      >
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove course"
          className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-md text-muted-foreground hover:bg-black/5 hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold tracking-tight text-rose-600">
                {offering.course_code}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-ink text-paper uppercase tracking-wider">
                Sec {offering.section}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {offering.credit} cr
              </span>
            </div>
            <h3 className="mt-1 font-display text-lg tracking-tight font-semibold leading-tight text-ink">
              {offering.title}
            </h3>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="text-ink">{offering.faculty_name}</span>
            <span className="text-muted-foreground">({offering.faculty_initial})</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="text-ink">{offering.program}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
          {offering.days.map((day, i) => (
            <div key={i} className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center justify-center w-9 py-0.5 rounded bg-rose-50 text-rose-700 font-medium uppercase tracking-wider text-[10px]">
                {day}
              </span>
              <span className="inline-flex items-center gap-1 text-ink font-medium">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {offering.times[i]}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground ml-auto">
                <MapPin className="w-3 h-3" />
                {offering.rooms[i] ?? offering.rooms[0]}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  const sections = row.courseCode ? getSectionsFor(offerings, row.courseCode) : [];
  const selectedCourse = courses.find((c) => c.code === row.courseCode);

  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-white/60 p-5 relative">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove row"
          className="absolute top-3 right-3 grid place-items-center w-7 h-7 rounded-md text-muted-foreground hover:bg-black/5 hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3 pr-8">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Course
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  "h-11 w-full justify-between font-normal",
                  !selectedCourse && "text-muted-foreground",
                )}
              >
                {selectedCourse ? (
                  <span className="truncate">
                    <span className="font-mono font-semibold text-ink">{selectedCourse.code}</span>
                    <span className="text-muted-foreground"> — {selectedCourse.title}</span>
                  </span>
                ) : (
                  "Search course code or title…"
                )}
                <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
              <Command
                filter={(value, search) =>
                  value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                }
              >
                <CommandInput placeholder="Search by code or title…" />
                <CommandList>
                  <CommandEmpty>No course found.</CommandEmpty>
                  <CommandGroup>
                    {courses.map((c) => {
                      const taken = takenCodes.includes(c.code) && c.code !== row.courseCode;
                      return (
                        <CommandItem
                          key={c.code}
                          value={`${c.code} ${c.title}`}
                          disabled={taken}
                          onSelect={() => {
                            onChange({ ...row, courseCode: c.code, section: undefined });
                            setOpen(false);
                          }}
                          className={cn(taken && "opacity-40")}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              row.courseCode === c.code ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="font-mono text-xs font-semibold mr-2">{c.code}</span>
                          <span className="text-sm truncate">{c.title}</span>
                          {taken && (
                            <span className="ml-auto text-[10px] text-muted-foreground">added</span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Section
          </Label>
          <Select
            value={row.section ?? ""}
            onValueChange={(v) => onChange({ ...row, section: v })}
            disabled={!row.courseCode}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Pick section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
