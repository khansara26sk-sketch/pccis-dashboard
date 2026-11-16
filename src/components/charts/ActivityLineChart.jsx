import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function ActivityLineChart({ data = [] }) {
  const { isDark } = useTheme();

  const strokeColorGrid = isDark ? '#29382D' : '#E5EDE6';
  const textColorAxis = isDark ? '#A3B3A6' : '#647067';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#19241C] p-3 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] shadow-xl text-xs">
          <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center gap-2 my-1">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#647067] dark:text-[#A3B3A6] capitalize">{entry.name}:</span>
              <span className="font-bold text-[#17211B] dark:text-[#F0FDF4]">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={strokeColorGrid} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: textColorAxis, fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: textColorAxis, fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            formatter={(value) => <span className="text-[#647067] dark:text-[#A3B3A6]">{value}</span>}
          />
          <Area
            type="monotone"
            dataKey="compliant"
            name="Compliant Packages"
            stroke={isDark ? '#4ADE80' : '#16A34A'}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorCompliant)"
          />
          <Area
            type="monotone"
            dataKey="issues"
            name="Issues Flagged"
            stroke="#DC2626"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorIssues)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
