import React from 'react';

export default function SkeletonLoader({ className = 'h-6 w-full', count = 1 }) {
  return (
    <div className="space-y-2.5 w-full">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-[#E5EDE6] dark:bg-[#29382D] ${className}`}
        />
      ))}
    </div>
  );
}
