import { BookOpen, Brain } from "lucide-react";
import { SectionPracticePanel } from "@/components/section/SectionPracticePanel";
import { SectionResourcesPanel } from "@/components/section/SectionResourcesPanel";

export function SectionResourcesTab({
  courseCode,
  sectionLabel,
}: {
  courseCode: string;
  sectionLabel: string;
}) {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <section className="space-y-4">
        <header className="flex items-center gap-2 pb-2 border-b border-[#dce5d4]/60">
          <BookOpen className="w-5 h-5 text-[#7d9b76]" />
          <div>
            <h3 className="font-display text-lg font-bold text-slate-800">Section resources</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Files and links shared for this section. Faculty can upload; everyone can view and
              download.
            </p>
          </div>
        </header>
        <SectionResourcesPanel courseCode={courseCode} sectionLabel={sectionLabel} />
      </section>

      <section className="space-y-4">
        <header className="flex items-center gap-2 pb-2 border-b border-[#dce5d4]/60">
          <Brain className="w-5 h-5 text-[#7d9b76]" />
          <div>
            <h3 className="font-display text-lg font-bold text-slate-800">Section practice</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Extra practice problems for this section, plus course-wide problems from admin.
            </p>
          </div>
        </header>
        <SectionPracticePanel courseCode={courseCode} sectionLabel={sectionLabel} />
      </section>
    </div>
  );
}
