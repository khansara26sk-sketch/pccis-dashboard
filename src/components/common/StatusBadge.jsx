
import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  XCircle,
  EyeOff,
  Ban,
  FileImage,
  LoaderCircle,
} from 'lucide-react';

const neutralStyle =
  'bg-neutral-500/10 text-[#647067] dark:text-[#A3B3A6] border-neutral-300 dark:border-neutral-700';

const statusConfig = {
  // Compliance results
  pass: {
    label: 'Compliant',
    bg: 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]',
    dot: 'bg-[#16A34A] dark:bg-[#4ADE80]',
    icon: CheckCircle2,
  },
  compliant: {
    label: 'Compliant',
    bg: 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]',
    dot: 'bg-[#16A34A] dark:bg-[#4ADE80]',
    icon: CheckCircle2,
  },
  'potential issue': {
    label: 'Potential Issue',
    bg: 'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
    dot: 'bg-[#DC2626]',
    icon: AlertTriangle,
  },
  'manual review': {
    label: 'Manual Review',
    bg: 'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
    dot: 'bg-[#D97706]',
    icon: HelpCircle,
  },
  'not analyzed': {
    label: 'Not Analyzed',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: HelpCircle,
  },

  // Inspection workflow statuses
  draft: {
    label: 'Draft',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: Clock,
  },
  image_uploaded: {
    label: 'Image Uploaded',
    bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    icon: FileImage,
  },
  analyzing: {
    label: 'Analyzing',
    bg: 'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
    dot: 'bg-[#D97706] animate-pulse',
    icon: LoaderCircle,
  },
  analyzed: {
    label: 'Analyzed',
    bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    bg: 'bg-red-500/10 text-[#DC2626] dark:text-red-400 border-red-500/20',
    dot: 'bg-[#DC2626]',
    icon: XCircle,
  },

  // Review statuses
  not_reviewed: {
    label: 'Not Reviewed',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: Clock,
  },
  in_review: {
    label: 'In Review',
    bg: 'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
    dot: 'bg-[#D97706]',
    icon: HelpCircle,
  },
  reviewed: {
    label: 'Reviewed',
    bg: 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]',
    dot: 'bg-[#16A34A]',
    icon: CheckCircle2,
  },

  // Evidence statuses
  processing: {
    label: 'Processing',
    bg: 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]',
    dot: 'bg-[#16A34A] animate-pulse',
    icon: Clock,
  },
  detected: {
    label: 'Detected',
    bg: 'bg-[#DCFCE7] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border-[#E5EDE6] dark:border-[#29382D]',
    dot: 'bg-[#16A34A]',
    icon: CheckCircle2,
  },
  uncertain: {
    label: 'Uncertain',
    bg: 'bg-amber-500/10 text-[#D97706] dark:text-amber-400 border-amber-500/20',
    dot: 'bg-[#D97706]',
    icon: HelpCircle,
  },
  'not detected': {
    label: 'Not Detected',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: EyeOff,
  },
  unreadable: {
    label: 'Unreadable',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: XCircle,
  },
  'not applicable': {
    label: 'Not Applicable',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: Ban,
  },
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}) {
  const normalized = String(status ?? '').toLowerCase().trim();

  const config = statusConfig[normalized] || {
    label: status || 'Unknown',
    bg: neutralStyle,
    dot: 'bg-[#647067]',
    icon: HelpCircle,
  };

  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1.5'
      : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${sizeClasses} transition-colors tracking-tight`}
    >
      {showIcon && (
        <Icon
          className={
            size === 'sm'
              ? 'w-3 h-3 shrink-0'
              : 'w-3.5 h-3.5 shrink-0'
          }
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
