import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function ComplianceDonutChart({ data = [] }) {
  const { isDark } = useTheme();

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-[#19241C] p-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] shadow-xl text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.payload.color }}
            />
            <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4]">{item.name}:</span>
            <span className="font-bold text-[#17211B] dark:text-[#F0FDF4]">{item.value} ({percentage}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-56 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomTooltip />} />
            <Pie
              data={data}
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              stroke={isDark ? '#19241C' : '#FFFFFF'}
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold tracking-tight text-[#17211B] dark:text-[#F0FDF4] font-['Plus_Jakarta_Sans']">
            {total}
          </span>
          <span className="text-[10px] uppercase font-semibold text-[#647067] dark:text-[#A3B3A6]">
            Total Labels
          </span>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-[#E5EDE6] dark:border-[#29382D] text-xs">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          return (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[#647067] dark:text-[#A3B3A6] truncate text-[11px]">
                  {item.name}
                </span>
              </div>
              <span className="font-semibold text-[#17211B] dark:text-[#F0FDF4] text-[11px] shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
