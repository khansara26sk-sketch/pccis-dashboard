
import apiClient from './api';

// Create a real inspection draft in the database.
export const createInspection = async (productName = null) => {
  const response = await apiClient.post('/api/inspections', {
    product_name: productName,
  });

  return {
    success: true,
    data: response.data,
  };
};

// Upload an image as evidence for an existing inspection.
export const uploadInspectionEvidence = async (
  inspectionId,
  file,
  onProgress
) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post(
    `/api/inspections/${inspectionId}/evidence`,
    formData,
    {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percent);
        }
      },
    }
  );

  return {
    success: true,
    data: response.data,
  };
};

// Get evidence metadata for an inspection.
export const fetchInspectionEvidence = async (inspectionId) => {
  const response = await apiClient.get(
    `/api/inspections/${inspectionId}/evidence`
  );

  return {
    success: true,
    data: response.data,
  };
};

// Get inspections from the database.
export const fetchInspectionsList = async (params = {}) => {
  const response = await apiClient.get('/api/inspections', { params });

  return {
    success: true,
    data: response.data,
  };
};

// Get one inspection from the database.
export const fetchInspectionById = async (id) => {
  const response = await apiClient.get(`/api/inspections/${id}`);

  return {
    success: true,
    data: response.data,
  };
};

// Backend health check.
export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/api/health', {
      timeout: 3000,
    });

    return {
      online: response.data?.status === 'ok',
      details: response.data,
    };
  } catch (err) {
    return {
      online: false,
      error: err.message || 'Backend health check failed',
    };
  }
};
