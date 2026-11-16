import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export default function StatCard({
  title,
  value,
  trend,
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
  subtitle,
  icon: Icon,
  badgeText
}) {
  const getTrendIcon = () => {
    if (trendType === 'positive') return <ArrowUpRight className="w-3.5 h-3.5 text-[#16A34A] dark:text-[#4ADE80] shrink-0" />;
    if (trendType === 'negative') return <ArrowDownRight className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />;
    return <Minus className="w-3.5 h-3.5 text-[#647067] dark:text-[#A3B3A6] shrink-0" />;
  };

  const getTrendClass = () => {
    if (trendType === 'positive') return 'text-[#15803D] dark:text-[#4ADE80] font-medium';
    if (trendType === 'negative') return 'text-[#DC2626] font-medium';
    return 'text-[#647067] dark:text-[#A3B3A6]';
  };

  return (
    <div className="group relative bg-white dark:bg-[#19241C] rounded-2xl p-5 border border-[#E5EDE6] dark:border-[#29382D] shadow-[0_2px_8px_rgba(21,128,61,0.04)] hover:shadow-md hover:border-[#15803D]/40 dark:hover:border-[#4ADE80]/40 transition-all duration-200">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#647067] dark:text-[#A3B3A6]">
          {title}
        </p>
        {Icon && (
          <div className="p-2 rounded-xl bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] group-hover:bg-[#DCFCE7] dark:group-hover:bg-[#173D26]/80 transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
          {value}
        </span>
        {badgeText && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] dark:bg-[#173D26] text-[#15803D] dark:text-[#4ADE80] border border-[#E5EDE6] dark:border-[#29382D]">
            {badgeText}
          </span>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 pt-3 border-t border-[#E5EDE6]/60 dark:border-[#29382D]/60 flex items-center gap-1.5 text-xs text-[#647067] dark:text-[#A3B3A6]">
          {trend && (
            <div className="flex items-center gap-0.5">
              {getTrendIcon()}
              <span className={getTrendClass()}>{trend}</span>
            </div>
          )}
          {subtitle && (
            <span className="text-[#647067] dark:text-[#A3B3A6] truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
