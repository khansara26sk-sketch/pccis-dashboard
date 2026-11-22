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


// Fetch an individual inspection report in JSON format
export const fetchInspectionReport = async (inspectionId) => {
  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/report`
  );

  return response.data;
};

// Download an individual inspection report in PDF format
export const downloadInspectionReportPDF = async (inspectionId) => {
  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/report/pdf`,
    {
      responseType: 'blob',
    }
  );

  return response.data;
};

