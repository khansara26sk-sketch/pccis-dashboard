import React from 'react';
import { PackageSearch } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageSearch,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#19241C] rounded-2xl border border-[#E5EDE6] dark:border-[#29382D] my-4 shadow-[0_2px_8px_rgba(21,128,61,0.03)]">
      <div className="p-3.5 rounded-2xl bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] mb-3">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-semibold text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
        {title}
      </h4>
      <p className="text-xs text-[#647067] dark:text-[#A3B3A6] max-w-sm mt-1 mb-5">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
