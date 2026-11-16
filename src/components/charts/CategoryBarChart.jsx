import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function CategoryBarChart({ data = [] }) {
  const { isDark } = useTheme();

  const strokeColorGrid = isDark ? '#29382D' : '#E5EDE6';
  const textColorAxis = isDark ? '#A3B3A6' : '#647067';

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#19241C] p-2.5 rounded-xl border border-[#E5EDE6] dark:border-[#29382D] shadow-xl text-xs">
          <p className="font-semibold text-[#17211B] dark:text-[#F0FDF4] mb-1.5">{label}</p>
          {payload.map((entry, index) => (
            <div key={`entry-${index}`} className="flex items-center gap-2 my-1">
              <span
                className="w-2 h-2 rounded-xs"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[#647067] dark:text-[#A3B3A6]">{entry.name}:</span>
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
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={strokeColorGrid} />
          <XAxis
            dataKey="category"
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
            wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
            formatter={(value) => <span className="text-[#647067] dark:text-[#A3B3A6]">{value}</span>}
          />
          <Bar
            dataKey="inspected"
            name="Total Inspected"
            fill={isDark ? '#22C55E' : '#15803D'}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="violations"
            name="Issues Detected"
            fill="#DC2626"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
