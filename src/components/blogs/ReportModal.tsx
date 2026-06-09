import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  itemType?: "post" | "comment" | "doubt";
}

const REPORT_REASONS = [
  { id: "spam", label: "Spam & Advertising", desc: "Commercial advertising, scams, or irrelevant links" },
  { id: "harassment", label: "Harassment & Hate Speech", desc: "Bullying, personal attacks, or offensive remarks" },
  { id: "inappropriate", label: "Inappropriate Content", desc: "Profanity, sexually explicit content, or offensive language" },
  { id: "academic_dishonesty", label: "Academic Dishonesty", desc: "Leaking exam questions, sharing solutions, or general cheating" },
  { id: "other", label: "Other / Violation of Guidelines", desc: "Other behavior that violates community standards" }
];

export function ReportModal({ isOpen, onClose, onSubmit, itemType = "post" }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("spam");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedReason, details);
    setDetails("");
    setSelectedReason("spam");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl w-full max-w-md overflow-hidden z-10"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Report {itemType === "post" ? "Blog Post" : itemType === "comment" ? "Comment" : "Doubt Thread"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">Help us keep the community helpful and respectful.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Reason</span>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 no-scrollbar">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer ${
                        selectedReason === reason.id
                          ? "border-rose-500 bg-rose-50/10"
                          : "border-slate-205 border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        value={reason.id}
                        checked={selectedReason === reason.id}
                        onChange={() => setSelectedReason(reason.id)}
                        className="mt-0.5 accent-rose-600 cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-800 leading-none">{reason.label}</span>
                        <span className="block text-[9px] text-slate-400 mt-1 leading-snug">{reason.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Text Area Details */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Details (Optional)</span>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Explain why you are reporting this content..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 text-xs text-slate-800 resize-none bg-slate-50/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
