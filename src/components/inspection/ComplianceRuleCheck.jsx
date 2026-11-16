import React from 'react';
import { Scale, Info } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function ComplianceRuleCheck({ rules = [], onRuleStatusChange }) {
  const compliantCount = rules.filter(r => r.status.toLowerCase() === 'compliant').length;
  const issuesCount = rules.filter(r => r.status.toLowerCase() === 'potential issue').length;
  const reviewCount = rules.filter(r => ['manual review', 'unreadable', 'uncertain'].includes(r.status.toLowerCase())).length;

  return (
    <div className="bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] p-5 shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E5EDE6] dark:border-[#29382D]">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80]" />
            <h3 className="text-sm font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
              Legal Metrology Compliance Rule Audit
            </h3>
          </div>
          <p className="text-xs text-[#647067] dark:text-[#A3B3A6] mt-0.5">
            Automated verification against Packaged Commodities Rules 2011.
          </p>
        </div>

        {/* Tally summary pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] font-medium border border-[#E5EDE6] dark:border-[#29382D]">
            {compliantCount} Compliant
          </span>
          {issuesCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-[#DC2626] font-medium border border-red-500/20">
              {issuesCount} Potential Issues
            </span>
          )}
          {reviewCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-[#D97706] dark:text-amber-400 font-medium border border-amber-500/20">
              {reviewCount} Manual Review
            </span>
          )}
        </div>
      </div>

      {/* Advisory Alert Banner */}
      <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] dark:bg-[#173D26]/40 border border-[#E5EDE6] dark:border-[#29382D] text-xs text-[#17211B] dark:text-[#F0FDF4] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#15803D] dark:text-[#4ADE80] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-[#15803D] dark:text-[#4ADE80]">Statutory Advisory:</span> Automated OCR confidence flags or missing OCR text indicate inspection uncertainty and do not constitute conclusive legal non-compliance. Authorized officers must physically corroborate physical labels prior to issuing notice.
        </p>
      </div>

      {/* Rule Cards */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-4 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] bg-[#F7FAF7]/60 dark:bg-[#141D17]/40 hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/30 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#17211B] dark:text-[#F0FDF4]">
                  {rule.declaration}
                </span>
                <span className="text-[11px] font-mono text-[#647067] dark:text-[#A3B3A6] bg-[#E5EDE6]/60 dark:bg-[#29382D] px-2 py-0.5 rounded font-medium">
                  {rule.ruleRef}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={rule.status} size="sm" />
              </div>
            </div>

            <p className="text-xs text-[#647067] dark:text-[#A3B3A6] leading-relaxed mb-2.5">
              {rule.explanation}
            </p>

            {/* Extracted Evidence Snippet */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-[#19241C] border border-[#E5EDE6] dark:border-[#29382D] flex items-start gap-2 text-xs">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6] shrink-0 mt-0.5">
                OCR Evidence:
              </span>
              <span className="font-mono text-[#15803D] dark:text-[#4ADE80] break-all flex-1">
                {rule.evidence || '—'}
              </span>
            </div>

            {/* Inspector Override Action */}
            <div className="mt-3 pt-2.5 border-t border-[#E5EDE6]/60 dark:border-[#29382D]/60 flex items-center justify-between text-[11px]">
              <span className="text-[#647067] dark:text-[#A3B3A6]">Inspector Verification:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRuleStatusChange && onRuleStatusChange(rule.id, 'Compliant')}
                  className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
                    rule.status.toLowerCase() === 'compliant'
                      ? 'bg-[#15803D] text-white dark:bg-[#22C55E] dark:text-[#101713] font-semibold'
                      : 'text-[#647067] dark:text-[#A3B3A6] hover:bg-[#F0FDF4] dark:hover:bg-[#173D26]'
                  }`}
                >
                  Mark Compliant
                </button>
                <button
                  type="button"
                  onClick={() => onRuleStatusChange && onRuleStatusChange(rule.id, 'Potential Issue')}
                  className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
                    rule.status.toLowerCase() === 'potential issue'
                      ? 'bg-[#DC2626] text-white font-semibold'
                      : 'text-[#647067] dark:text-[#A3B3A6] hover:bg-red-50 dark:hover:bg-red-950/30'
                  }`}
                >
                  Flag Issue
                </button>
                <button
                  type="button"
                  onClick={() => onRuleStatusChange && onRuleStatusChange(rule.id, 'Manual Review')}
                  className={`px-2.5 py-1 rounded-md transition-colors text-xs font-medium ${
                    rule.status.toLowerCase() === 'manual review'
                      ? 'bg-[#D97706] text-white font-semibold'
                      : 'text-[#647067] dark:text-[#A3B3A6] hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  Manual Review
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
