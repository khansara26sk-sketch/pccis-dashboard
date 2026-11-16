import React from 'react';
import { CheckCircle2, Loader2, Circle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const stages = [
  { id: 1, label: 'Uploading package image', desc: 'Verifying dimensions and optical clarity' },
  { id: 2, label: 'Image preprocessing', desc: 'Binarization, de-skewing & contrast equalization' },
  { id: 3, label: 'Extracting text (OCR)', desc: 'Detecting character glyphs & bounding zones' },
  { id: 4, label: 'Identifying declarations', desc: 'Parsing MRP, Net Qty, Dates, Address entities' },
  { id: 5, label: 'Checking compliance rules', desc: 'Legal Metrology (Packaged Commodities) validation' },
];

export default function OcrPipelineStages({ currentStage = 1 }) {
  return (
    <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-6 shadow-xs my-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
        <h4 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
          AI Inspection Pipeline in Progress
        </h4>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const isDone = currentStage > stage.id;
          const isActive = currentStage === stage.id;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: stage.id * 0.05 }}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                isActive
                  ? 'border-[#15803D]/40 bg-[#F0FDF4] dark:bg-[#173D26]/40 shadow-xs'
                  : isDone
                  ? 'border-[#E5EDE6]/60 dark:border-[#29382D]/80 bg-[#F7FAF7]/60 dark:bg-[#141D17]/40'
                  : 'border-transparent text-[#647067] dark:text-[#A3B3A6]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A] dark:text-[#4ADE80]" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-[#15803D] dark:text-[#4ADE80] animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-[#E5EDE6] dark:text-[#29382D]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isActive
                        ? 'text-[#15803D] dark:text-[#4ADE80]'
                        : isDone
                        ? 'text-[#17211B] dark:text-[#F0FDF4]'
                        : 'text-[#647067] dark:text-[#A3B3A6]'
                    }`}
                  >
                    Stage {stage.id}: {stage.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#15803D] dark:text-[#4ADE80] animate-pulse">
                      Processing...
                    </span>
                  )}
                  {isDone && (
                    <span className="text-[10px] font-medium text-[#16A34A] dark:text-[#4ADE80]">
                      Completed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#647067] dark:text-[#A3B3A6] mt-0.5">
                  {stage.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
