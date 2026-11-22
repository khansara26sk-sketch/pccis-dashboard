import React from 'react';
import {
  AlertCircle,
  Beaker,
  CheckCircle2,
  CircleHelp,
  Info,
  ShieldAlert,
} from 'lucide-react';

const cardClass =
  'rounded-2xl border border-[#E5EDE6] bg-white p-5 shadow-[0_2px_8px_rgba(21,128,61,0.03)] dark:border-[#29382D] dark:bg-[#19241C]';

const statusStyles = {
  pass: {
    icon: CheckCircle2,
    classes:
      'border-[#BBF7D0] bg-[#DCFCE7] text-[#15803D] dark:border-[#245B35] dark:bg-[#173D26] dark:text-[#4ADE80]',
  },
  'potential issue': {
    icon: ShieldAlert,
    classes:
      'border-amber-500/20 bg-amber-500/10 text-[#B45309] dark:text-amber-300',
  },
  'manual review': {
    icon: Info,
    classes:
      'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  'not detected': {
    icon: AlertCircle,
    classes:
      'border-amber-500/20 bg-amber-500/10 text-[#B45309] dark:text-amber-300',
  },
  unreadable: {
    icon: AlertCircle,
    classes:
      'border-amber-500/20 bg-amber-500/10 text-[#B45309] dark:text-amber-300',
  },
  'not applicable': {
    icon: CircleHelp,
    classes:
      'border-[#E5EDE6] bg-[#F7FAF7] text-[#647067] dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#A3B3A6]',
  },
};

const getText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export default function RuleResultCard({
  name,
  ruleId,
  fieldName,
  ruleVersion,
  status,
  explanation,
  evidenceText,
  isSample = false,
}) {
  const ruleName =
    getText(name) || getText(ruleId) || 'Rule information unavailable';
  const ruleIdentifier = getText(ruleId);
  const field = getText(fieldName);
  const version = getText(ruleVersion);
  const statusLabel = getText(status) || 'Status unavailable';
  const statusDetails = statusStyles[statusLabel.toLowerCase()] || {
    icon: CircleHelp,
    classes:
      'border-[#E5EDE6] bg-[#F7FAF7] text-[#647067] dark:border-[#29382D] dark:bg-[#141D17] dark:text-[#A3B3A6]',
  };
  const StatusIcon = statusDetails.icon;
  const explanationText = getText(explanation);
  const evidence = getText(evidenceText);

  return (
    <article className={cardClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-sm font-bold text-[#17211B] dark:text-[#F0FDF4]">
            {ruleName}
          </h3>
          {ruleIdentifier && name && (
            <span className="font-mono text-[10px] text-[#647067] dark:text-[#A3B3A6]">
              {ruleIdentifier}
            </span>
          )}
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-[#B45309] dark:text-amber-300">
              <Beaker className="h-3 w-3" />
              SAMPLE
            </span>
          )}
        </div>
        <span
          className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusDetails.classes}`}
          role="status"
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>

      {(field || version) && (
        <p className="mt-2 break-words font-mono text-[10px] text-[#647067] dark:text-[#A3B3A6]">
          {field && `Field: ${field}`}
          {field && version && ' · '}
          {version && `Version: ${version}`}
        </p>
      )}

      <p className="mt-3 break-words text-xs leading-relaxed text-[#647067] dark:text-[#A3B3A6]">
        {explanationText || 'No explanation was provided.'}
      </p>

      {evidence && (
        <div className="mt-4 rounded-xl border border-[#E5EDE6] bg-[#F7FAF7] p-3 dark:border-[#29382D] dark:bg-[#141D17]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
            Evidence text
          </p>
          <p className="mt-1 break-words font-mono text-xs leading-relaxed text-[#17211B] dark:text-[#F0FDF4]">
            {evidence}
          </p>
        </div>
      )}
    </article>
  );
}
