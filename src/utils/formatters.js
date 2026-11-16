/**
 * Data Formatting Utilities
 */

export const formatDate = (dateString, includeTime = true) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return new Intl.DateTimeFormat('en-IN', options).format(date);
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatConfidence = (score) => {
  if (score === undefined || score === null) return 'N/A';
  return `${Math.round(score)}%`;
};

export const getConfidenceColorClass = (score) => {
  if (score >= 90) return 'text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-[#173D26] border-[#16A34A]/30';
  if (score >= 70) return 'text-[#D97706] dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-[#DC2626] dark:text-red-400 bg-red-500/10 border-red-500/20';
};
