import apiClient from './api';

/**
 * Dashboard & Reports Service
 * Pure real backend queries without mock fallbacks.
 */

export const fetchDashboardMetrics = async () => {
  const response = await apiClient.get('/api/dashboard/stats');
  return {
    success: true,
    data: response.data,
  };
};

export const fetchReportsData = async (params = {}) => {
  const response = await apiClient.get('/api/reports', { params });
  return {
    success: true,
    data: response.data,
  };
};
